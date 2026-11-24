import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Posts from "../components/Posts";
const SERVER = import.meta.env.VITE_DEV_SERVER;

export default function Home() {
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const query = new URLSearchParams(location.search).get("q");
  const searching = location.pathname === "/posts/search";
  const trending = location.pathname === "/trending";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const endpoint = searching ? `/posts/search${location.search}` : trending ? "/posts/trending" : `/posts/${location.search}`;
    axios.get(`${SERVER}${endpoint}`).then(({ data }) => {
      if (!active) return;
      setPosts(trending ? data : [...data].sort((a,b) => new Date(b.updated_at)-new Date(a.updated_at)));
    }).catch(err => {
      if (active) setError(err.response?.data?.message || "Could not load posts. Please try again.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location.search, searching, trending]);

  return (
    <section className="flex flex-col text-white pb-[100px] md:pb-[110px] lg:pl-32 lg:pr-16 xl:pl-[200px] xl:pr-28 max-w-[1600px] mx-auto">
      <div className="flex flex-col py-14 items-center md:items-start md:px-24 overflow-x-hidden">
        <div className="flex flex-col items-center md:ml-9">
          <div className="bg-primary w-6 h-1 lg:w-10 lg:h-1.5" />
          <h2 className="text-lg lg:text-2xl">{searching ? `Searched for: ${query || ""}` : trending ? "Trending" : "Latest"}</h2>
        </div>
      </div>
      <div className="flex flex-col gap-6 px-6 md:gap-10 lg:gap-14">
        {loading ? <p role="status">Loading posts…</p> : error ? <p role="alert">{error}</p> : posts.length ? <Posts posts={posts} /> : <p>No public posts found.</p>}
      </div>
    </section>
  );
}
