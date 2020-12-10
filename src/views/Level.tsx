import React from 'react';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';

import Button from 'react-bulma-components/lib/components/button';
import Heading from 'react-bulma-components/lib/components/heading';
import Section from 'react-bulma-components/lib/components/section';
import Tile from 'react-bulma-components/lib/components/tile';

import { Board, Inventory, DialogueBox } from '../components';
import { Floor, Item, Obstacle, Player } from '../constants';
import { enumContains, indexOf2d } from '../helpers';
import * as User from '../services/User';

import './Level.scss';

interface LevelProps<T> extends RouteComponentProps<T> {}

interface LevelParams {
  id: number
}

interface LevelState {
  id: number,
  player: Player,
  cells: (Floor|Item|Obstacle|Player)[][],
  inventoryItems: Item[],
  npcText: string,
  showNPC: boolean,
  timerStarted: boolean,
  time: number
}

class Level extends React.Component<LevelProps<LevelParams>, LevelState> {
  timer: number = 0;

  constructor(props: LevelProps<LevelParams>) {
    super(props);
    this.state = {
      id: this.props.match.params.id,
      player: Player.PLAYER1,
      cells: [],
      inventoryItems: [],
      npcText: '',
      showNPC: false,
      timerStarted: false,
      time: 0
    };
  }

  restart = () => {
    this.setState({ inventoryItems: [] });
    this.stopTimer();
    this.resetTimer();

    const userPlayer: Player = User.localData().player;
    this.setState({ player: userPlayer });

    fetch(`${process.env.REACT_APP_API_URL}/level/${this.state.id}`)
      .then(response => response.text().then(text => {
        const data = JSON.parse(text);

        const cells = data.cells;
        const playerDefault = indexOf2d(cells, 'player');
        if (playerDefault) {
          cells[playerDefault[0]][playerDefault[1]] = this.state.player;
        }
        this.setState({ cells });

        const npcText = data.npcText;
        this.setState({ npcText });
      }));
  }

  componentDidMount() {
    this.restart();

    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowLeft':
          if (!this.state.timerStarted) {
            this.startTimer();
          }
          this.manipulateBoard('left');
          break;
        case 'ArrowRight':
          if (!this.state.timerStarted) {
            this.startTimer();
          }
          this.manipulateBoard('right');
          break;
        case 'ArrowUp':
          if (!this.state.timerStarted) {
            this.startTimer();
          }
          this.manipulateBoard('up');
          break;
        case 'ArrowDown':
          if (!this.state.timerStarted) {
            this.startTimer();
          }
          this.manipulateBoard('down');
          break;
      }
    });
  }

  startTimer = () => {
    this.setState({ timerStarted: true });
    this.timer = window.setInterval(() => this.setState({
      time: this.state.time + 1
    }), 1000);
  }

  stopTimer = () => {
    this.setState({ timerStarted: false });
    window.clearInterval(this.timer);
  }

  resetTimer = () => {
    this.setState({
      timerStarted: false,
      time: 0
    });
  }

  unlockDoor = (door: string) => {
    let index = -1;
    switch (door) {
      case Obstacle.DOOR1:
        index = this.state.inventoryItems.findIndex(item => item === Item.KEY1);
        break;
      case Obstacle.DOOR2:
        index = this.state.inventoryItems.findIndex(item => item === Item.KEY2);
        break;
      case Obstacle.DOOR3:
        index = this.state.inventoryItems.findIndex(item => item === Item.KEY3);
        break;
      case Obstacle.DOOR4:
        index = this.state.inventoryItems.findIndex(item => item === Item.KEY4);
        break;
      case Obstacle.DOOR5:
        index = this.state.inventoryItems.findIndex(item => item === Item.KEY5);
        break;
    }

    if (index > -1) {
      this.state.inventoryItems.splice(index, 1);
      return true;
    }

    return false;
  }

  canMove = (array: string[][], row: number, column: number, direction: string) => {
    switch (direction) {
      case 'left':
        if (column === 0) {
          return false;
        }
        const toLeft = array[row][column-1];
        if (toLeft === Obstacle.WALL || toLeft === Obstacle.NPC) {
          return false;
        } else if (enumContains(Obstacle, toLeft) && !this.unlockDoor(toLeft)) {
          return false;
        }
        break;
      case 'right':
        if (column === array[0].length-1) {
          return false;
        }
        const toRight = array[row][column+1];
        if (toRight === Obstacle.WALL || toRight === Obstacle.NPC) {
          return false;
        } else if (enumContains(Obstacle, toRight) && !this.unlockDoor(toRight)) {
          return false;
        }
        break;
      case 'up':
        if (row === 0) {
          return false;
        }
        const above = array[row-1][column];
        if (above === Obstacle.WALL || above === Obstacle.NPC) {
          return false;
        } else if (enumContains(Obstacle, above) && !this.unlockDoor(above)) {
          return false;
        }
        break;
      case 'down':
        if (row === array.length-1) {
          return false;
        }
        const below = array[row+1][column];
        if (below === Obstacle.WALL || below === Obstacle.NPC) {
          return false;
        } else if (enumContains(Obstacle, below) && !this.unlockDoor(below)) {
          return false;
        }
        break;
    }

    return true;
  }

  checkNPC = (row: number, column: number) => {
    if (column !== 0) {
      const toLeft = this.state.cells[row][column-1];
      if (toLeft === Obstacle.NPC) {
        return true;
      }
    }

    if (column !== this.state.cells[0].length-1) {
      const toRight = this.state.cells[row][column+1];
      if (toRight === Obstacle.NPC) {
        return true;
      }
    }

    if (row !== 0) {
      const above = this.state.cells[row-1][column];
      if (above === Obstacle.NPC) {
        return true;
      }
    }

    if (row !== this.state.cells.length-1) {
      const below = this.state.cells[row+1][column];
      if (below === Obstacle.NPC) {
        return true;
      }
    }

    return false;
  }

  checkWin = (array: string[][], row: number, column: number, direction: string) => {
    switch (direction) {
      case 'left':
        if (column === 0) {
          return false;
        }
        const toLeft = array[row][column-1];
        if (toLeft === Floor.EXIT) {
          return true;
        }
        break;
      case 'right':
        if (column === array[0].length-1) {
          return false;
        }
        const toRight = array[row][column+1];
        if (toRight === Floor.EXIT) {
          return true;
        }
        break;
      case 'up':
        if (row === 0) {
          return false;
        }
        const above = array[row-1][column];
        if (above === Floor.EXIT) {
          return true;
        }
        break;
      case 'down':
        if (row === array.length-1) {
          return false;
        }
        const below = array[row+1][column];
        if (below === Floor.EXIT) {
          return true;
        }
        break;
    }

    return false;
  }

  manipulateBoard = (direction: string) => {
    let newCells = this.state.cells.map(innerArray => innerArray.slice());
    let [playerRow, playerColumn] = indexOf2d(newCells, this.state.player);

    if (!this.canMove(newCells, playerRow, playerColumn, direction)) {
      return;
    }

    newCells[playerRow][playerColumn] = Floor.DEFAULT;

    switch (direction) {
      case 'left':
        if(enumContains(Item, newCells[playerRow][playerColumn-1])) {
          this.state.inventoryItems.push(newCells[playerRow][playerColumn-1] as Item);
        }
        newCells[playerRow][playerColumn-1] = this.state.player;
        break;
      case 'right':
        if(enumContains(Item, newCells[playerRow][playerColumn+1])) {
          this.state.inventoryItems.push(newCells[playerRow][playerColumn+1] as Item);
        }
        newCells[playerRow][playerColumn+1] = this.state.player;
        break;
      case 'up':
        if(enumContains(Item, newCells[playerRow-1][playerColumn])) {
          this.state.inventoryItems.push(newCells[playerRow-1][playerColumn] as Item);
        }
        newCells[playerRow-1][playerColumn] = this.state.player;
        break;
      case 'down':
        if(enumContains(Item, newCells[playerRow+1][playerColumn])) {
          this.state.inventoryItems.push(newCells[playerRow+1][playerColumn] as Item);
        }
        newCells[playerRow+1][playerColumn] = this.state.player;
        break;
    }

    this.setState({ cells: newCells });

    if (this.checkWin(newCells, playerRow, playerColumn, direction)) {
      this.stopTimer();
    }

    [playerRow, playerColumn] = indexOf2d(this.state.cells, this.state.player);
    this.setState({ showNPC: this.checkNPC(playerRow, playerColumn) });
  }

  render() {
    let dialogue = null;
    if (this.state.showNPC) {
      dialogue = <DialogueBox text={this.state.npcText}/>;
    }

    return (
      <Tile kind='ancestor'>
        <Tile size={7}>
          <Section className='level-board'>
            <Board cells={this.state.cells}/>
          </Section>
        </Tile>
        <Tile kind='parent' vertical>
          <Tile>
            <Section>
              <Heading>Level {this.state.id}</Heading>
            </Section>
            <Section>
              <Link to='/game'><Button>Back</Button></Link>
              <Button onClick={this.restart}>Restart Level</Button>
            </Section>
            <Section>
              <Heading>Time: {this.state.time}</Heading>
            </Section>
          </Tile>
          <Tile>
            <Inventory items={this.state.inventoryItems}/>
          </Tile>
          <Tile>
            {dialogue}
          </Tile>
        </Tile>
      </Tile>
    );
  }
}

export default Level;
