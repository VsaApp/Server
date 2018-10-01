import React, {Component} from 'react';
import {Button, IconButton, InputAdornment, TextField} from '@material-ui/core';
import {Visibility, VisibilityOff} from '@material-ui/icons';
import './LoginForm.css';
import logo from '../images/logo.png';
import errors from '../errors';
import Sha256 from '../helpers/sha256';
import {instanceOf} from 'prop-types';
import {Cookies, withCookies} from 'react-cookie';

class LoginForm extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      username: '',
      usernameError: false,
      usernameLabel: 'Nutzername',
      password: '',
      passwordError: false,
      passwordLabel: 'Passwort',
      showPassword: false
    };
    this.keyPress = this.keyPress.bind(this);
    this.submitLogin = this.submitLogin.bind(this);
    this.checkState = this.checkState.bind(this);
  }

  keyPress(e) {
    if (e.keyCode === 13) {
      this.submitLogin();
    }
  }

  submitLogin() {
    this.checkState();
    if (this.state.username !== '' && this.state.password !== '') {
      fetch('/api/login?username=' + this.state.username + '&password=' + Sha256.hash(this.state.password))
        .then(response => response.json()).then(response => {
        if (response.error == null) {
          const {cookies} = this.props;
          cookies.set('username', this.state.username);
          cookies.set('password', Sha256.hash(this.state.password));
        } else if (response.error === errors.WRONG_USERNAME_PASSWORD) {
          this.setState({
            usernameError: true,
            usernameLabel: 'Falscher Nutzername oder Passwort',
            passwordError: true,
            passwordLabel: 'Falscher Nutzername oder Passwort'
          });
        } else {
          alert('Ein unbekannter Fehler ist aufgetreten. Versuche es später nochmal.');
        }
      });
    }
  }

  checkState() {
    this.setState({
      usernameError: this.state.username === '',
      usernameLabel: this.state.username === '' ? 'Kein Nutzername gesetzt' : 'Nutzername',
      passwordError: this.state.password === '',
      passwordLabel: this.state.password === '' ? 'Kein Passwort gesetzt' : 'Passwort'
    });
  }

  render() {
    return (
      <form id='loginForm' onSubmit={this.submitLogin}>
        <img src={logo} alt='Logo' id='loginLogo'/>
        <br/>
        <TextField
          error={this.state.usernameError}
          required
          id='loginUsername'
          className='loginTextField'
          label={this.state.usernameLabel}
          color='secondary'
          value={this.state.username}
          onChange={event => this.setState({username: event.target.value})}
          onKeyDown={this.keyPress}
        />
        <br/>
        <TextField
          error={this.state.passwordError}
          required
          id='loginPassword'
          className='loginTextField'
          type={this.state.showPassword ? 'text' : 'password'}
          label={this.state.passwordLabel}
          color='secondary'
          value={this.state.password}
          onChange={event => this.setState({password: event.target.value})}
          autoComplete='current-password'
          InputProps={{
            endAdornment: (
              <InputAdornment position='end'>
                <IconButton
                  aria-label='Passwortsichtbarkeit ändern'
                  onClick={() => this.setState(state => ({showPassword: !state.showPassword}))}>
                  {this.state.showPassword ? <VisibilityOff/> : <Visibility/>}
                </IconButton>
              </InputAdornment>
            ),
          }}
          onKeyDown={this.keyPress}
        />
        <br/>
        <Button
          variant='contained'
          className='loginButton'
          id='loginSubmit'
          color='secondary'
          onClick={this.submitLogin}>
          Anmelden
        </Button>
      </form>
    );
  }
}

export default withCookies(LoginForm);