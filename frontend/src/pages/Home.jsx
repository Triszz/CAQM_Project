import { useAuthContext } from "../hooks/useAuthContext";
function Home() {
  const { user } = useAuthContext();

  return (
    <>
      <h1>Hi, {user ? user.username : "Guest"}</h1>
    </>
  );
}
export default Home;
