import React, { Component, useState } from 'react';
// eslint-disable-next-line
import { Box, Button, TextField, Typography, Link, Select } from '@material-ui/core';
import queryString from 'query-string';
// eslint-disable-next-line
import { navigate } from '@reach/router';
import Paper from '@material-ui/core/Paper';
import { EditingState } from '@devexpress/dx-react-grid';
import {
  Grid,
  Table,
  TableHeaderRow,
  TableEditColumn,
  TableInlineCellEditing,
} from '@devexpress/dx-react-grid-material-ui';

const getRowId = row => row.id;

const FocusableCell = ({onClick, ...restProps}) => {
  return <Table.Cell {...restProps} tabIndex={0} onFocus={onClick} />;
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

export default (props) => {

    const getPhases = async (sid) {
        return (await (await fetch('https://phasetimer.cc/api/getSession',{method: 'POST', body: JSON.stringify({sid: sid})})).json()).phases;
    };

    const getAuth = async () => {
        const values = queryString.parse(props.location.search);
        if(values.sid && values.key) {
            return values;
        }
        else {
            let authData = (await (await fetch('https://phasetimer.cc/api/newSession')).json());
            return authData;
        }
    }

  const [columns] = useState([
    { name: 'name', title: 'Name' },
    { name: 'duration', title: 'Duration' },
  ]);
  const [auth, setAuth] = useState(await getAuth());
  const [rows, setRows] = useState(await getPhases(auth.sid));
  const [editingCells, setEditingCells] = useState([]);

  const commitChanges = ({ added, changed, deleted }) => {
    let changedRows;
    if (added) {
      const startingAddedId = rows.length > 0
        ? Math.max(rows[rows.length - 1].id, rows[0].id) + 1
        : 0;
      changedRows = [
        ...added.map((row, index) => ({
          id: startingAddedId + index,
          ...row,
        })),
        ...rows,
      ];
      setEditingCells([{ rowId: startingAddedId, columnName: columns[0].name }]);
    }
    if (changed) {
      changedRows = rows.map(row => (changed[row.id] ? { ...row, ...changed[row.id] } : row));
    }
    if (deleted) {
      const deletedSet = new Set(deleted);
      changedRows = rows.filter(row => !deletedSet.has(row.id));
    }

    setRows(changedRows);
  };

  const addEmptyRow = () => commitChanges({ added: [{}] });

  return (
    <Paper>
        <Typography>Set up the phases of your timer!</Typography>
        <Typography>Your <b>public</b> timer link is: <Link href={"timer/" + this.state.auth.sid}>{"https://phasetimer.cc/timer/" + this.state.auth.sid}</Link></Typography>
        <Typography>Your <b>admin</b> timer link is: <Link href={privateLink}>{"https://phasetimer.cc/timerAdmin/..."}</Link> (right-click and Copy Link Location!)</Typography>
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
