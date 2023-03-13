import React, { useState } from 'react';
import Box from '@material-ui/core/Box';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Button from '@material-ui/core/Button';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import { CustomTextField } from './inputs';
import Dropzone from '../dropzone/Dropzone';
import API from '../../api';
import useStyles from './styles';
import { useHouse } from '../../context/House';
import { useAlertDispatch } from '../../context/Alert';
import Comment from './Comment';
import CalendarEvent from './CalendarEvent';

export default function CommentsSection({ isLoading, houseStatuses }) {
  const classes = useStyles();
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [reset, setReset] = useState(false);
  const [checked, setChecked] = useState(false);
  const [calendar_status, set_calendar_status] = useState({
        checked: false,
        date: ''
  });
  const [{ houseSelected }, { updateHouse }] = useHouse();
  const { openAlert } = useAlertDispatch();
  const currentStatusIndex = houseStatuses.findIndex(
    s => s.name === houseSelected.status
  );
  const newStatus = houseStatuses[currentStatusIndex + 1];

  const setFieldValue = (_, value) => {
    if (!value || !value.length) return;
    setFiles(value);
  };

  const handleChange = e => {
    const { value } = e.target;
    setReset(false);
    setDescription(value);
  };

  const handleChangeStatus = (event) => {
      
      setChecked(event.target.checked);
      if (event.target.checked) {
        set_calendar_status({
           ...calendar_status,
            checked: true
        });
      }

  }

  const handleSaveComment = async event => {
    console.log(`houseSelected`, houseSelected);
    console.log(`files`, files);

    try {
      event.stopPropagation();
      setUploading(true);
      const { idHouse, zone, comments = [], address , lastName , idHr } = houseSelected;
      console.log('idHr222', houseSelected);
      //date
      const date_event = new Date(calendar_status.date);
      date_event.setHours(new Date().getHours(), new Date().getMinutes());
  
      const date_time_start_event = date_event
      const date_time_finish_event = new Date(calendar_status.date)
      date_time_finish_event.setHours(23, 59, 59, 999);

      //aumentar 1 dia
      date_time_finish_event.setDate(date_time_finish_event.getDate() + 1);
      date_time_start_event.setDate(date_time_start_event.getDate() + 1);

      let status = '';
      if (checked) status = newStatus.name;

      const { data: comment } = await API.createComment(
        JSON.stringify({ idHouse, description, status })
      );
      console.log('api calendar_event', date_time_start_event , date_time_finish_event );
      let commentFolder = '';
      console.log('Created Comment: ', comment);
     
      await API.createCalendarEvent(
        JSON.stringify({
          title: `House ${idHouse} - ${address}`,
          description: `House ${idHouse} - ${address}`,
          start_: date_time_start_event,
          end_: date_time_finish_event,
          location: address,
        })
      );

      let house_selected = JSON.parse(sessionStorage.getItem('house_selected'));
      const anio = date_time_start_event.getFullYear();
      const mes = date_time_start_event.getMonth() + 1;
      const dia = date_time_start_event.getDate();
      
      house_selected.dateNextCall = `${anio}-${mes}-${dia}`

      await updateHouse({ house: house_selected });

      if (comment && files.length) {
        commentFolder = API.uploadFilesToComment({
          zone,
          files,
          idHouse: `${idHouse} / ${address}`,
          idComment: comment.idComment,
        });
      }

      updateHouse({
        house: {
          idHouse,
          status: status || houseSelected.status,
          comments: [{ ...comment, files: commentFolder }, ...comments],
        },
      });
      openAlert({
        variant: 'success',
        message: 'Comment created successfully',
      });
    } catch (error) {
      console.error(error);
      openAlert({
        variant: 'error',
        message: 'Something went wrong creating the comment',
      });
    } finally {
      setUploading(false);
      setChecked(false);
      setDescription('');
      setFiles([]);
      setReset(true);
    }
  };

  const loading = uploading || isLoading;
  const disabled = loading || !description;
  const inputProps = {
    handleChange,
    touched: {
      comment: true,
    },
    errors: {
      comment: false,
    },
    values: {
      comment: description,
    },
  };

  return (
    <Box width="100%" my={8}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="files-content"
          id="files-header"
        >
          <Typography variant="h5" component="h2" paragraph>
            Update Process...
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container item xs={12} spacing={3}>
            <CustomTextField
              type="text"
              name="comment"
              label="New Update"
              multiline
              rows={3}
              rowsMax={6}
              disabled={loading}
              variant="outlined"
              {...inputProps}
            />
            <Grid item xs={12} md={9}>
              <Dropzone
                multiple
                reset={reset}
                field={'commentFiles'}
                setFieldValue={setFieldValue}
              />
            </Grid>
            <Grid item xs={12} md={3} container justify="flex-end">
              {currentStatusIndex < houseStatuses.length - 1 && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={checked}
                      onChange={handleChangeStatus}
                      name="status"
                    />
                  }
                  label={`Update House Status to ${newStatus.name}`}
                />
              )}
              <Button
                color="primary"
                variant="contained"
                disabled={disabled}
                className={classes.button}
                onClick={handleSaveComment}
              >
                {uploading ? 'Saving Comment...' : 'Save Comment'}
              </Button>
            </Grid>
            <Grid item md={12}>
              <List dense aria-label="house comments">
                {(houseSelected.comments || []).map((c, i) => (
                  <ListItem key={i} divider button selected={!!c.status}>
                    <Comment comment={c} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      <CalendarEvent 
        properties={
           {
            on_calendar_event_click: calendar_status,
            set_on_calendar_event_click: set_calendar_status
          }
        }
      />
    </Box>
  );
}
