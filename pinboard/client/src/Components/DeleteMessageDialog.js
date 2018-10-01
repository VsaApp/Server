import React, {Component} from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@material-ui/core';
import {instanceOf} from 'prop-types';
import {Cookies, withCookies} from 'react-cookie';

class DeleteMessageDialog extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false
    };
    this.delete = this.delete.bind(this);
    this.close = this.close.bind(this);
  }

  delete() {
    this.setState({
      loading: true
    });
    const {cookies} = this.props;
    fetch('/api/delete?username=' + cookies.get('username') + '&password=' + cookies.get('password') + '&id=' + this.props.id)
      .then(response => response.json()).then(response => {
      if (response.error != null) {
        alert('Ein unbekannter Fehler ist aufgetreten. Versuche es später nochmal.');
      }
      this.close();
    });
  }

  close() {
    this.setState({
      loading: false
    });
    this.props.onClose();
  }

  render() {
    return (
      <Dialog
        open={this.props.open}
        onClose={this.close}
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'>
        <DialogTitle id='alert-dialog-title'>Nachricht löschen</DialogTitle>
        <DialogContent>
          <DialogContentText id='alert-dialog-description'>
            Die Nachricht mit dem Titel '{this.props.name}' wirklich löschen?
          </DialogContentText>
          {this.state.loading ?
            <CircularProgress style={{marginTop: 10}} color='secondary'/> : ''}
        </DialogContent>
        <DialogActions>
          <Button onClick={this.close} color='primary'>
            Abbrechen
          </Button>
          <Button onClick={this.delete} color='primary' autoFocus>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

export default withCookies(DeleteMessageDialog);