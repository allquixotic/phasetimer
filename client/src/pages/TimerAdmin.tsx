// eslint-disable-next-line
import React, { Component, useState, useEffect } from 'react';
// eslint-disable-next-line
import { Box, Button, TextField, Typography, Link, Select } from '@material-ui/core';
import queryString from 'query-string';
// eslint-disable-next-line
import { navigate } from '@reach/router';
import Paper from '@material-ui/core/Paper';
// eslint-disable-next-line
import { EditingState, ChangeSet } from '@devexpress/dx-react-grid';
import {
  Grid,
  Table,
  TableHeaderRow,
  TableEditColumn,
  TableInlineCellEditing,
} from '@devexpress/dx-react-grid-material-ui';
import { Phase, AnonAuthData, AdminAuthData, UpdateSessionData, PublicSessionData } from '../api/index';
import { DefaultApi as PhaseTimerApi } from '../api/index';
const api : PhaseTimerApi = new PhaseTimerApi();


interface UiPhase {
  id: number,
  name: string,
  duration: number
}

interface CellBeingEdited { 
  rowId: number | string, 
  columnName: string
}

const getRowId = (row: any) => row.id;

const FocusableCell = (propies : any) => {
  return React.createElement(Table.Cell, propies, null);
};

/*
When I had a class Component my state looked like this...
{
  auth: {
    sid: "",
    key: ""
  },
  phases: []
}

Each phase is an object like this:
{
  name: "foo",
  duration: 7
}
*/

export default (props: any) => {

  const [columns] = useState([
    { name: 'name', title: 'Name' },
    { name: 'duration', title: 'Duration' },
  ]);
  var [auth, setAuth] = useState({sid: "", key: ""} as AdminAuthData);
  var [rows, setRows] = useState([] as UiPhase[]);
  const [editingCells, setEditingCells] = useState([] as CellBeingEdited[]);

  async function getPhases(asid: string) {
    let psd : PublicSessionData = await api.getSessionPost({ sid: asid });
    let ap : Phase[] = psd.phases;
    let retval : UiPhase[] = [];
    let idx = 0;
    ap.forEach((ph) => {
      retval.push({id: idx++, name: ph.name, duration: ph.duration});
    });
    setRows(retval);
  };

  useEffect(() => {
    async function getAuth() : Promise<{val: AnonAuthData, changed: boolean}> {
        const values = queryString.parse(props.location.search);
        let retval: AdminAuthData = {sid: "", key: ""} as AdminAuthData;
        let changed : boolean = false;
        if(values.sid && values.key && (values.sid !== auth.sid || values.key !== auth.key)) {
            retval = {sid: values.sid, key: values.key} as AdminAuthData;
            changed = true;
        }
        else {
            if(!auth.key && !auth.sid) {
              retval = await api.newSessionGet();
              changed = true;
            }
        }
        return {val: retval, changed: changed};
    }

    getAuth().then((arg : {val: AdminAuthData, changed: boolean}) => {
      if(arg.changed) {
        setAuth(arg.val);
        getPhases(arg.val.sid).then(() => {
          let wl = window.location;
          let newurl = `${wl.protocol}//${wl.host}${wl.pathname}?sid=${arg.val.sid}&key=${arg.val.key}`;
          window.history.pushState({path: newurl}, '', newurl);
        });
      }
    });
  }, [auth, props.location.search]);

  useEffect(() => {
    function uiPhasesToPhases() : Phase[] {
      let retval : Phase[] = [];
      rows.forEach((p : UiPhase) => {
        retval.push({name: p.name, duration: p.duration});
      });
      return retval;
    }

    if(auth.sid && auth.key) {
      api.updateSessionPost({sid: auth.sid, key: auth.key, phases: uiPhasesToPhases()});
    }
  }, [rows]);

  const commitChanges = ({ added, changed, deleted } : { added?: ReadonlyArray<any>, changed?:{[key: string]: any;}, deleted?: ReadonlyArray<number | string> }) => {
    let changedRows: UiPhase[] = [];
    if (added) {
      const startingAddedId = rows.length > 0
        ? Math.max(rows[rows.length - 1].id, rows[0].id) + 1
        : 0;
      changedRows = [
        ...added.map((row: any, index: any) => ({
          id: startingAddedId + index,
          ...row,
        })),
        ...rows,
      ];
      setEditingCells([{ rowId: startingAddedId, columnName: columns[0].name }]);
    }
    if (changed) {
      changedRows = rows.map((row: any) => (changed[row.id] ? { ...row, ...changed[row.id] } : row));
    }
    if (deleted) {
      const deletedSet = new Set(deleted);
      changedRows = rows.filter((row: any) => !deletedSet.has(row.id));
    }
    if(!(added || changed || deleted)) {
      changedRows = rows;
    }
    setRows(changedRows);
  };

  const addEmptyRow = () => commitChanges({ added: [{} as UiPhase], changed: undefined, deleted: undefined });

  const getPrivateLink = () => {
    if(auth && auth.sid) {
      return `timerAdmin?sid=${auth.sid}&key=${auth.key}`;
    }
    else {
      return "";
    }
  }

  return (
    <Paper>
        <Typography>Set up the phases of your timer!</Typography>
        <Typography>Your <b>public</b> timer link is: <Link href={"timer/" + (auth && auth.sid ? auth.sid : "")}>{"https://phasetimer.cc/timer/" + (auth && auth.sid ? auth.sid : "")}</Link></Typography>
        <Typography>Your <b>admin</b> timer link is: <Link href={getPrivateLink()}>{"https://phasetimer.cc/timerAdmin/..."}</Link> (right-click and Copy Link Location!)</Typography>
        <Typography>If you plan to keep this timer around, you should bookmark or save the admin link. Once you navigate away from this page, there's no way to get it back.</Typography>
        <Typography>Phases are executed from top to bottom.</Typography>
      <Grid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
      >
        <EditingState
          onCommitChanges={commitChanges}
          editingCells={editingCells}
          onEditingCellsChange={setEditingCells}
          addedRows={[]}
          onAddedRowsChange={addEmptyRow}
        />
        <Table cellComponent={FocusableCell} />
        <TableHeaderRow />
        <TableInlineCellEditing selectTextOnEditStart />
        <TableEditColumn
          showAddCommand
          showDeleteCommand
        />
      </Grid>
    </Paper>
  );
};
