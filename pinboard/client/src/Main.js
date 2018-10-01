import React, {Component} from 'react';
import {
  AppBar,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import SettingsIcon from '@material-ui/icons/Settings';
import {Cookies, withCookies} from 'react-cookie';
import {instanceOf} from 'prop-types';
import './Main.css';
import NewMessageDialog from './Components/NewMessageDialog';
import DeleteMessageDialog from './Components/DeleteMessageDialog';

class Main extends Component {
  static propTypes = {
    cookies: instanceOf(Cookies).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      newMessageDialogOpen: false,
      messages: [],
      deleteMessageDialogOpen: false,
      deleteMessageName: '',
      deleteMessageId: '',
      followers: 0
    };

    this.logout = this.logout.bind(this);
    this.newMessage = this.newMessage.bind(this);
    this.getMessages = this.getMessages.bind(this);
    this.getMessages();
    this.getFollowers();
  }

  getFollowers() {
    const {cookies} = this.props;
    fetch('/api/getfollowers?username=' + cookies.get('username'))
      .then(response => response.json()).then(response => {
      if (response.error == null) {
        this.setState({followers: response.followers});
      } else {
        alert('Ein unbekannter Fehler ist aufgetreten. Versuche es später nochmal.');
      }
    });
  }

  getMessages() {
    const {cookies} = this.props;
    fetch('/api/messages?username=' + cookies.get('username'))
      .then(response => response.json()).then(response => {
      if (response.error == null) {
        this.setState({messages: response.data});
      } else {
        alert('Ein unbekannter Fehler ist aufgetreten. Versuche es später nochmal.');
      }
    });
  }

  logout() {
    const {cookies} = this.props;
    cookies.remove('username');
    cookies.remove('password');
  }

  newMessage() {
    this.setState({newMessageDialogOpen: true});
  }

  render() {
    return (
      <div id='main'>
        <AppBar position='static'>
          <Toolbar>
            <Typography variant='title' id='mainTitle'>
              VsaApp Pinnwand
            </Typography>
            <Button id='mainLogout' variant='contained' color='secondary' onClick={this.logout}>Abmelden</Button>
          </Toolbar>
        </AppBar>
        <Card id='mainFollowersCard'>
          <CardContent>
            <Typography variant='headline' component='h2'>
              Abonnenten: {this.state.followers}
            </Typography>
          </CardContent>
        </Card>
        <List id='mainMessageList' component='nav'>
          <ListItem className='mainMessageListItem' button>
            <ListItemText primary='Titel'/>
            <ListItemText primary='Nachricht'/>
            <ListItemText primary='Datum und Uhrzeit'/>
            <ListItemIcon>
              <SettingsIcon/>
            </ListItemIcon>
          </ListItem>
          {this.state.messages.map(message => {
            const dateObj = new Date(message.time * 1000);
            const year = dateObj.getUTCFullYear();
            let month = dateObj.getUTCMonth() + 1;
            let day = dateObj.getUTCDate();
            let hour = dateObj.getHours();
            let minute = dateObj.getMinutes();
            let second = dateObj.getSeconds();
            if (month.toString().length === 1) {
              month = '0' + month;
            }
            if (day.toString().length === 1) {
              day = '0' + day;
            }
            if (hour.toString().length === 1) {
              hour = '0' + hour;
            }
            if (minute.toString().length === 1) {
              minute = '0' + minute;
            }
            if (second.toString().length === 1) {
              second = '0' + second;
            }
            let time = day + '.' + month + '.' + year + ' ' + hour + ':' + minute + ':' + second;
            return (
              <ListItem className='mainMessageListItem' key={message.id} button>
                <ListItemText primary={message.title}/>
                <ListItemText primary={message.message}/>
                <ListItemText id='mainMessageListTime' primary={time}/>
                <ListItemIcon onClick={() => {
                  this.setState({
                    deleteMessageDialogOpen: true,
                    deleteMessageName: message.title,
                    deleteMessageId: message.id
                  });
                }}>
                  <DeleteIcon/>
                </ListItemIcon>
              </ListItem>
            );
          })}
        </List>
        <DeleteMessageDialog open={this.state.deleteMessageDialogOpen}
                             name={this.state.deleteMessageName}
                             id={this.state.deleteMessageId}
                             onClose={() => {
                               this.setState({deleteMessageDialogOpen: false});
                               this.getMessages();
                             }}/>
        <NewMessageDialog open={this.state.newMessageDialogOpen}
                          onClose={() => {
                            this.setState({newMessageDialogOpen: false});
                            this.getMessages();
                          }}/>
        <Button variant='fab' color='secondary' aria-label='Neue Nachricht' id='mainNewMessage'
                onClick={this.newMessage}>
          <AddIcon/>
        </Button>
      </div>
    );
  }
}

export default withCookies(Main);