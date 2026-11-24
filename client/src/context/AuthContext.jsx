import React, { useState, createContext, useEffect } from "react";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    // Parse the user from localStorage only if it exists
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      return storedUser?.id && typeof storedUser.username === "string" ? storedUser : null;
    } catch { return null; }
  });

  useEffect(() => {
    // Save the currentUser to localStorage whenever it changes
    if (currentUser) {
      localStorage.setItem("user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("user"); // Clear when user is null
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};
