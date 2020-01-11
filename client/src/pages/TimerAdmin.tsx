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

interface AuthData {
  sid: string,
  key: string
}

interface Phase {
  id: number,
  name: string,
  duration: number
}

interface ApiPhase {
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
  var [auth, setAuth] = useState({sid: "", key: ""} as AuthData);
  var [rows, setRows] = useState([] as Phase[]);
  const [editingCells, setEditingCells] = useState([] as CellBeingEdited[]);

  useEffect(() => {
    async function getPhases(sid: string) {
      let ap : ApiPhase[] = (await (await fetch('https://phasetimer.cc/api/getSession',{method: 'POST', body: JSON.stringify({sid: sid})})).json()).phases;
      let retval : Phase[] = [];
      let idx = 0;
      ap.forEach((ph) => {
        retval.push({id: idx++, name: ph.name, duration: ph.duration});
      });
      setRows(retval);
    }

    async function getAuth() {
        const values = queryString.parse(props.location.search);
        if(values.sid && values.key) {
            setAuth({sid: values.sid, key: values.key} as AuthData);
        }
        else {
            let authData : AuthData = (await (await fetch('https://phasetimer.cc/api/newSession')).json());
            setAuth(authData);
        }
    }

    getAuth().then(() => {
      getPhases(auth.sid);
    });
  }, [auth, props.location.search]);

  const commitChanges = ({ added, changed, deleted } : { added?: ReadonlyArray<any>, changed?:{[key: string]: any;}, deleted?: ReadonlyArray<number | string> }) => {
    let changedRows: Phase[] = [];
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

  const addEmptyRow = () => commitChanges({ added: [{} as Phase], changed: undefined, deleted: undefined });

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
