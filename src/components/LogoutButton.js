import { useAuth0 } from '@auth0/auth0-react';
import Button from 'react-bulma-components/lib/components/button';

const LogoutButton = () => {
  const { logout } = useAuth0();
  return (
    <Button onClick={() => logout({ returnTo: window.location.origin })}>Log Out</Button>
  );
}

export default LogoutButton;
