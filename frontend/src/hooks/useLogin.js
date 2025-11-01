import { useState } from "react";
import { UserAPI } from "../services/api";
import { useAuthContext } from "./useAuthContext";
export const useLogin = () => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useAuthContext();
  const login = async (email, password) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await UserAPI.login(email, password);
      localStorage.setItem("user", JSON.stringify(response.data));
      dispatch({ type: "LOGIN", payload: response.data });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      setError(errorMessage);
      console.error("Error login: ", error);
    } finally {
      setIsLoading(false);
    }
  };
  return { login, isLoading, error };
};
