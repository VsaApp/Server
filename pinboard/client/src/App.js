import React, {Component} from 'react';
import './App.css';
import LoginForm from './Components/LoginForm.js';
import {createMuiTheme, MuiThemeProvider} from '@material-ui/core/styles';
import {Cookies, withCookies} from 'react-cookie';
import {instanceOf} from 'prop-types';
import Main from './Main';

const theme = createMuiTheme({
  palette: {
    primary: {main: '#67a744'},
    secondary: {main: '#5bc638'}
  },
});

class App extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  };

  render() {
    const {cookies} = this.props;
    return (
      <MuiThemeProvider theme={theme}>
        <div className='App'>
          {
            cookies.get('username') === undefined || cookies.get('password') === undefined
              ? <LoginForm/>
              : <Main/>
          }
        </div>
      </MuiThemeProvider>
    );
  }
}

export default withCookies(App);
