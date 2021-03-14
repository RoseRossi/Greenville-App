import React, { useState } from 'react';
import Box from '@material-ui/core/Box';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Divider from '@material-ui/core/Divider';
import { CustomTextField } from './inputs';
import Dropzone from '../dropzone/Dropzone';
import API from '../../api';
import useStyles from './styles';
import { useHouse } from '../../context/House';
import { useAlertDispatch } from '../../context/Alert';
import Comment from './Comment';

export default function CommentsSection({ isLoading }) {
  const classes = useStyles();
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [reset, setReset] = useState(false);
  const [{ houseSelected }, HouseContext] = useHouse();
  const { openAlert } = useAlertDispatch();

  const setFieldValue = (_, value) => {
    if (!value || !value.length) return;
    setFiles(value);
  };

  const handleChange = e => {
    const { value } = e.target;
    setDescription(value);
  };
  console.log(`houseSelected`, houseSelected);
  const handleSaveComment = async () => {
    try {
      setUploading(true);
      const { idHouse, zone, comments } = houseSelected;
      const { data: comment } = await API.createComment(
        JSON.stringify({ idHouse, description })
      );
      let commentFolder = '';
      console.log('Created Comment: ', comment);
      if (comment && files.length) {
        const { idComment } = comment;
        const fileFromDrive = await API.uploadHouseCommentsFiles({
          idComment,
          idHouse,
          files,
          zone,
        });
        console.log('fileFromDrive', fileFromDrive);

        if (!fileFromDrive.folder) {
          throw new Error(
            'Somenthing went wrong creating files. It is not returning any folder.'
          );
        }
        commentFolder = fileFromDrive.folder;
        await API.updateComment(
          JSON.stringify({ files: commentFolder, idComment })
        );
      }
      HouseContext.updateHouse({
        idHouse,
        comments: [{ ...comment, files: commentFolder }, ...comments],
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
      setDescription('');
      setFiles([]);
      setReset(false);
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

  console.log(`files`, files);

  return (
    <Box width="100%" mt={8}>
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
            <Grid item md={9}>
              <Dropzone
                multiple
                reset={reset}
                field={'commentFiles'}
                setFieldValue={setFieldValue}
              />
            </Grid>
            <Grid item md={3} container justify="flex-end">
              <Button
                color="primary"
                variant="outlined"
                disabled={disabled}
                className={classes.button}
                onClick={handleSaveComment}
              >
                {uploading ? 'Saving Comment...' : 'Save Comment'}
              </Button>
            </Grid>
            <Divider variant="middle" flexItem />
            {(houseSelected.comments || []).map((c, i) => (
              <Comment key={i} comment={c} />
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}