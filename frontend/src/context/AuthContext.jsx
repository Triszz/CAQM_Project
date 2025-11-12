import { createContext, useReducer, useEffect } from "react";

export const AuthContext = createContext();
const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN":
      return { user: action.payload, isLoading: false };
    case "LOGOUT":
      return { user: null, isLoading: false };
    case "INITIALIZE":
      return { user: action.payload, isLoading: false };
    default:
      return state;
  }
};
export const AuthContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    dispatch({ type: "INITIALIZE", payload: user });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
