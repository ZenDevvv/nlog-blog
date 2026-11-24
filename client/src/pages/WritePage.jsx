import { useNavigate } from "react-router-dom";
import Write from "../components/Write";

export default function WritePage() {
  const navigate = useNavigate();
  return <Write createPost={true} setCreatePost={() => navigate("/")} />;
}
