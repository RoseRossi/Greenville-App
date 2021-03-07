import React, { useCallback, useState } from 'react';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Formik } from 'formik';
import useStyles from './styles';
import { createValidationSchema, getInitialValues } from './form-settings';
import API from '../../api';
import { useAlertDispatch } from '../../context/Alert';
import { useHouseDispatch } from '../../context/House';
import HomeFields from './HomeFields';
import useHouseForm from '../../hooks/useHouseForm';
import FilesFields from './FilesFields';

const noFolderCreated = () => {
  throw new Error(
    'Somenthing went wrong creating files. It is not returning any folder.'
  );
};

// props: group, zone, files, ...etc
async function uploadFileToHouse({ idHouse, ...props }) {
  const fileFromDrive = await API.uploadHouseFiles({
    idHouse,
    ...props,
  });
  console.log('fileFromDrive', fileFromDrive);
  if (!fileFromDrive.folder) noFolderCreated();
  return fileFromDrive;
}

async function uplaodFilesGroups({ idHouse, zone, houseFiles = [] }) {
  if (!houseFiles.length) return null;
  const [firstGroup, ...restGroups] = houseFiles;
  // Upload first group independently
  // so we can create the folder for the rest of files
  const result = await uploadFileToHouse({ idHouse, zone, ...firstGroup });
  if (!restGroups || !restGroups.length) {
    return result;
  }
  return Promise.all(
    restGroups.map(fileGroup =>
      uploadFileToHouse({ idHouse, zone, ...fileGroup })
    )
  );
}

export default function CreateHomeForm() {
  const classes = useStyles();
  const HouseContext = useHouseDispatch();
  const { openAlert } = useAlertDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const {
    filesGroups = [],
    loading: loadingDependencies,
    ...dependencies
  } = useHouseForm();
  const initialFilesValues = filesGroups.map(g => g.name);
  const initialValues = getInitialValues(initialFilesValues);

  const onSuccess = useCallback(({ data, resetForm }) => {
    openAlert({
      variant: 'success',
      message: `House #${data.idHouse} created successfully!`,
    });
    resetForm(initialValues);
  }, []);

  const onError = useCallback(e => {
    const message = 'Something went wrong creating the house';
    openAlert({
      message,
      variant: 'error',
    });
    console.error(`${message}: `, e);
  }, []);

  const onSubmit = useCallback(async (values, { setSubmitting, resetForm }) => {
    const { houseFiles, formData } = Object.keys(values).reduce(
      (acc, key) => {
        const keyValue = values[key];
        const isFile = Array.isArray(keyValue);
        if (isFile) {
          return {
            ...acc,
            houseFiles: [
              ...acc.houseFiles,
              { group: key, files: [...keyValue] },
            ],
          };
        }
        return { ...acc, formData: { ...acc.formData, [key]: keyValue } };
      },
      { houseFiles: [], formData: {} }
    );
    console.log('{houseFiles, formData}', { houseFiles, formData });
    try {
      setSubmitting(true);
      setIsLoading(true);
      const house = JSON.stringify(formData);
      const { data } = await API.createHouse(house);
      console.log('data', data);
      const { idHouse, zone } = data;
      HouseContext.addHouse(data);
      if (houseFiles.length) {
        const fileFromDrive = await uplaodFilesGroups({
          zone,
          idHouse,
          houseFiles,
        });
        await API.updateHouse(
          JSON.stringify({ files: fileFromDrive.folder, idHouse })
        );
      }
      onSuccess({ resetForm, data });
    } catch (e) {
      onError(e);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  }, []);

  return (
    <div>
      <Formik
        onSubmit={onSubmit}
        initialValues={initialValues}
        validationSchema={createValidationSchema}
      >
        {formikProps => {
          const {
            values,
            touched,
            errors,
            handleBlur,
            handleChange,
            handleSubmit,
            setFieldValue,
          } = formikProps;
          const inputProps = {
            classes,
            errors,
            touched,
            values,
            handleChange,
            handleBlur,
            isLoading,
          };
          return (
            <Paper className={classes.paper}>
              {loadingDependencies && <LinearProgress />}
              <Typography component="h1" variant="h4" gutterBottom>
                Create New House
              </Typography>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={4}>
                  <HomeFields
                    inputProps={inputProps}
                    dependencies={dependencies}
                  />
                  <Divider variant="middle" />
                  <FilesFields
                    {...{ values, isLoading, setFieldValue }}
                    filesGroups={filesGroups}
                  />
                  <Divider variant="middle" />
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      color="primary"
                      variant="contained"
                      className={classes.button}
                      disabled={isLoading || loadingDependencies}
                    >
                      Enviar
                    </Button>
                    {isLoading && <LinearProgress />}
                  </Grid>
                </Grid>
              </form>
            </Paper>
          );
        }}
      </Formik>
    </div>
  );
}
