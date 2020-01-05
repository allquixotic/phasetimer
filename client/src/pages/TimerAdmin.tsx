import React, { Component } from 'react';
// eslint-disable-next-line
import { Grommet, Box, Button, TextInput, Paragraph, Anchor } from 'grommet';
import {Redirect} from 'react-router-dom';

interface AuthData {
    sid: string,
    key: string
}

type TimerAdminState = {
    auth: AuthData
}

export class TimerAdmin extends Component<{}, TimerAdminState> {

    constructor(props : any) {
        super(props);
        this.state = {
            auth: {
                sid: "",
                key: ""
            }
        };
    }

    async componentDidMount() {
        let authData : AuthData = (await (await fetch('https://phasetimer.cc/api/newSession')).json()) as AuthData;
        this.setState({
            auth: authData
        });
    }

    render() {
        const divStyle = {marginLeft: '8px'} as React.CSSProperties;
        return (
            <div style={divStyle}>
            <Paragraph margin="small">Set up the phases of your timer!</Paragraph>
            <Paragraph margin="small" fill={true}>Your public timer link is: <Anchor href={"timer/" + this.state.auth.sid} label={"https://phasetimer.cc/timer/" + this.state.auth.sid}/></Paragraph>
            <Button id="update" primary label="Save" onClick={(e) => {
                return <Redirect to="/timerAdmin" />
            }}/>
            <br/>
            </div>
        );
    }
}

export default TimerAdmin;