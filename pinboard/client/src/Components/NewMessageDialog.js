import React, {Component} from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@material-ui/core';
import {Cookies, withCookies} from 'react-cookie';
import {instanceOf} from 'prop-types';

class NewMessageDialog extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  };

  constructor(props) {
    super(props);
    const {cookies} = this.props;
    this.state = {
      name: cookies.get('username'),
      title: '',
      titleError: false,
      titleLabel: 'Titel',
      message: '',
      messageError: false,
      messageLabel: 'Nachricht'
    };
    this.close = this.close.bind(this);
    this.send = this.send.bind(this);
  }

  send() {
    this.checkState();
    const {cookies} = this.props;
    if (this.state.title !== '' && this.state.message !== '') {
      this.setState({loading: true});
      fetch('/api/send?username=' + cookies.get('username') + '&password=' + cookies.get('password') + '&title=' + this.state.title + '&message=' + this.state.message)
        .then(response => response.json()).then(response => {
        this.setState({loading: false});
        if (response.error == null) {
          alert('Nachtricht wurde gesendet.');
        } else {
          alert('Ein unbekannter Fehler ist aufgetreten. Versuche es später nochmal.');
        }
        this.close();
      });
    }
  }

  checkState() {
    this.setState({
      titleError: this.state.title === '',
      titleLabel: this.state.title === '' ? 'Kein Titel gesetzt' : 'Titel',
      messageError: this.state.message === '',
      messageLabel: this.state.message === '' ? 'Keine Nachricht gesetzt' : 'Nachricht'
    });
  }

  close() {
    this.setState({
      title: '',
      titleError: false,
      titleLabel: 'Titel',
      message: '',
      messageError: false,
      messageLabel: 'Nachricht',
      loading: false
    });
    this.props.onClose();
  }

  render() {
    return (
      <Dialog
        open={this.props.open}
        onClose={this.close}
        aria-labelledby='form-dialog-title'>
        <DialogTitle id='form-dialog-title'>Neue Nachricht erstellen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Eine neue Nachricht an alle Leute, die '{this.state.name}' folgen, senden.
          </DialogContentText>
          <TextField
            error={this.state.titleError}
            required
            id='newMessageTitle'
            label={this.state.titleLabel}
            onChange={event => this.setState({title: event.target.value})}
            fullWidth
          />
          <br/>
          <TextField
            error={this.state.messageError}
            required
            id='newMessageText'
            label={this.state.messageLabel}
            onChange={event => this.setState({message: event.target.value})}
            fullWidth
            multiline={true}
            rows={5}
          />
          {this.state.loading ?
            <CircularProgress style={{marginTop: 10}} color='secondary'/> : ''}
        </DialogContent>
        <DialogActions>
          <Button onClick={this.close} color='primary'>
            Abbrechen
          </Button>
          <Button onClick={this.send} color='primary'>
            Senden
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export default withCookies(NewMessageDialog);