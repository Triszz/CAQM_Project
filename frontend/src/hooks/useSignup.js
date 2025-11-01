import { useAuthContext } from "./useAuthContext";
import { UserAPI } from "../services/api";
import { useState } from "react";
export const useSignup = () => {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useAuthContext();
  const signup = async (username, email, password) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await UserAPI.signup(username, email, password);
      localStorage.setItem("user", JSON.stringify(response.data));
      dispatch({ type: "LOGIN", payload: response.data });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  return { signup, error, isLoading };
};
