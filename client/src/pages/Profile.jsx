import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import Posts from "../components/Posts";
const SERVER = import.meta.env.VITE_DEV_SERVER;

export default function Profile() {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { id: userID } = useParams();

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setSettings(false);
    axios.get(`${SERVER}/profile/${userID}`).then(({data}) => {
      if (active) setRows(data);
    }).catch(err => { if (active) setError(err.response?.data?.message || "Could not load this profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userID, currentUser?.id]);

  const handleLogout = async () => {
    try {
      await axios.post(`${SERVER}/auth/logout`, {}, {withCredentials: true});
      setCurrentUser(null);
      navigate("/");
    } catch { setError("Could not sign out. Please try again."); }
  };
  const profile = rows[0];
  const posts = rows.filter(row => row.post_id != null).sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at));

  if (loading) return <p role="status" className="p-10 text-white lg:pl-40">Loading profile…</p>;
  if (error || !profile) return <p role="alert" className="p-10 text-white lg:pl-40">{error || "Profile not found"}</p>;
  return (
    <div className="text-white pt-8 flex flex-col pb-[130px] lg:pl-32 lg:pr-16 xl:pl-[200px] xl:pr-28 max-w-[1600px] mx-auto">
      {currentUser?.id === profile.id && <div className="self-end px-6">
        <button type="button" aria-label="Profile settings" aria-expanded={settings} onClick={() => setSettings(!settings)}>⋯</button>
        {settings && <button type="button" onClick={handleLogout} className="ml-4 text-primary">Sign out</button>}
      </div>}
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary text-darkBg w-[150px] aspect-square rounded-full grid place-content-center text-7xl">{profile.username?.[0]?.toUpperCase()}</div>
        <h2 className="text-2xl">@{profile.username}</h2>
        <p className="text-[#A5A5A5]">Joined since {dayjs(profile.created_at).format("MMMM DD, YYYY")}.</p>
      </div>
      <h2 className="text-center my-8 text-2xl">Posts</h2>
      <div className="px-6">{posts.length ? <Posts posts={posts} /> : <p className="text-center">No public posts yet.</p>}</div>
    </div>
  );
}
