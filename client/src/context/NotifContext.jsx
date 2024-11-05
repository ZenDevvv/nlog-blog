import React, { createContext, useContext, useState } from "react";

const NotifContext = createContext();

export const NotifProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const notifyError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000); // Clear after 5 seconds
  };

  const notifySuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 5000); // Clear after 5 seconds
  };

  return (
    <NotifContext.Provider value={{ error, success, notifyError, notifySuccess }}>
      {children}
    </NotifContext.Provider>
  );
};

export const useNotif = () => {
  return useContext(NotifContext);
};
