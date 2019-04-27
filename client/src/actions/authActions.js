import axios from "axios";
import setAuthToken from "../util/setAuthToken";
import jwt_decode from "jwt-decode";
import {
  SET_CURRENT_USER,
  GET_ERRORS,
  RECENT_CYCLE,
  REGISTER_USER
} from "./types";
import { toastr } from "react-redux-toastr";
// Login - Get User token
export const loginUser = userData => dispatch => {
  axios
    .post("/api/users/login", userData)
    .then(res => {
      console.log("Saving data to local storage");
      // Save to local storage
      const { token } = res.data;
      // Set token to local storage
      localStorage.setItem("jwtToken", token);
      // Set token to authorization header
      setAuthToken(token);
      //Decode user token
      const decoded = jwt_decode(token);
      // Set current user
      dispatch(setCurrentUser(decoded));
      toastr.success("Successfully logged in!", "Welcome to ULM Evaluations!");
    })
    .catch(err =>
      dispatch({
        type: GET_ERRORS,
        payload: err.response.data
      })
    );
};

export const setCurrentUser = decoded => {
  return {
    type: SET_CURRENT_USER,
    payload: decoded
  };
};

// Logout User
export const logoutUser = () => dispatch => {
  localStorage.removeItem("jwtToken");
  //Remove auth header for future requests
  setAuthToken(false);
  //Set current user to empty resulting isAuthenticated to be false
  dispatch(setCurrentUser({}));
};

export const recentCycle = () => dispatch => {
  axios
    .get("/api/dashboard/cycle")
    .then(res => {
      dispatch({
        type: RECENT_CYCLE,
        payload: res.data
      });
    })
    .catch(err => {
      dispatch({
        type: GET_ERRORS,
        payload: err.response.data
      });
    });
};

export const registerUser = (newUser, history) => dispatch => {
  axios
    .post("/api/users/register", newUser)
    .then(res => {
      dispatch({
        type: REGISTER_USER,
        payload: res.data
      });
      toastr.success("Successfully registered!", "Pleases login now!");
      history.push("/login");
    })
    .catch(err =>
      dispatch({
        type: GET_ERRORS,
        payload: err.response.data
      })
    );
};
