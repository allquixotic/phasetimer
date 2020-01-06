import React, { Component } from 'react';
// eslint-disable-next-line
import { Grommet, Box, Button, TextInput, Paragraph, Anchor, Table, TableHeader, TableRow, TableCell, TableBody, MaskedInput } from 'grommet';
import queryString from 'query-string';
// eslint-disable-next-line
import { navigate } from '@reach/router';

interface AuthData {
    sid: string,
    key: string
}

interface Phase {
    name: string,
    duration: number
}

type TimerAdminState = {
    auth: AuthData,
    phases: Phase[]
}

export class TimerAdmin extends Component<{}, TimerAdminState> {

    constructor(props : any) {
        super(props);
        this.state = {
            auth: {
                sid: "",
                key: ""
            },
            phases: []
        };
    }

    async getPhases(sid: string) : Promise<Phase[]> {
        return (await (await fetch('https://phasetimer.cc/api/getSession',{method: 'POST', body: JSON.stringify({sid: sid})})).json()).phases
    }

    async componentDidMount() {
        const values : any = queryString.parse(((this.props as any).location as any).search);
        if(values.sid && values.key) {
            this.setState({
                auth: { 
                    sid: values.sid,
                    key: values.key
                },
                phases: await this.getPhases(values.sid)
            });
        }
        else {
            let authData : AuthData = (await (await fetch('https://phasetimer.cc/api/newSession')).json()) as AuthData;
            this.setState({
                auth: authData,
                phases: []
            });
        }
    }

    getEmptyRow(idx: number) {
        return this.getRow(idx, "", -1);
    }

    getRow(idx : number, name: string, duration: number) {
        this.state.phases.push({name: "", duration: 0});
        (this as any)["phasename" + idx] = React.createRef();
        (this as any)["duration" + idx] = React.createRef();
        return <TableRow key={"row" + (name ? name : idx)}>
        <TableCell scope="row"><TextInput ref={(this as any)["phasename" + idx]} placeholder="Phase Name" defaultValue={name ? name : ""} onChange={(e) => {}}></TextInput></TableCell>
        <TableCell scope="row" size="xsmall"><MaskedInput ref={(this as any)["duration" + idx]} mask={
            [
                {
                  regexp: /^[1-9][0-9]*$/,
                  placeholder: "###"
                }
            ]
        } defaultValue={duration < 0 ? "" : duration}></MaskedInput></TableCell>
        <TableCell scope="row" size="xsmall"><Button label="Delete"></Button></TableCell>
        </TableRow>
    }

    getRows() {
        let retval : JSX.Element[] = [];
        let i = 0;
        this.state.phases.forEach((v: Phase) => {
            retval.push(this.getRow(i, v.name, v.duration));
            i++;
        }); 
        retval.push(this.getEmptyRow(i++));
        return retval;
    }

    render() {
        const divStyle = {marginLeft: '8px'} as React.CSSProperties;
        let privateLink : string = "timerAdmin?sid=" + this.state.auth.sid + "&key=" + this.state.auth.key;
        return (
            <div style={divStyle}>
            <Paragraph margin="small">Set up the phases of your timer!</Paragraph>
            <Paragraph margin="small" fill={true}>Your <b>public</b> timer link is: <Anchor href={"timer/" + this.state.auth.sid} label={"https://phasetimer.cc/timer/" + this.state.auth.sid}/></Paragraph>
            <Paragraph margin="small" fill={true}>Your <b>admin</b> timer link is: <Anchor href={privateLink} label={"https://phasetimer.cc/timerAdmin/..."}/> (right-click and Copy Link Location!)</Paragraph>
            <Paragraph margin="small" fill={true}>If you plan to keep this timer around, you should bookmark or save the admin link. Once you navigate away from this page, there's no way to get it back.</Paragraph>
            <Paragraph margin="small" fill={true}>Phases are executed from top to bottom.</Paragraph>
            <Box border="all" margin="medium" fill={false} width="large">
            <Paragraph margin="small" fill={true}><b>PHASES</b></Paragraph>
            <Table id='table'>
                <TableHeader>
                    <TableRow>
                        <TableCell scope="col" border="bottom">Name</TableCell>
                        <TableCell scope="col" border="bottom" size="small">Duration (seconds)</TableCell>
                        <TableCell scope="col" border="bottom" size="small">Delete</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {this.getRows()}
                </TableBody>
            </Table>
            <Box margin="xsmall" fill={false} width="small"><Button id="addRow" label="Add Row" onClick={(e) => {
                return this.getRow(this.state.phases.length, "", 0);
            }}/></Box>
            </Box>
            <Button id="update" primary label="Save" onClick={(e) => {
                
            }}/>
            <br/>
            </div>
        );
    }
}

export default TimerAdmin;