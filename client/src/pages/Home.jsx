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
    <section className="text-white pb-[100px] md:pb-[110px] lg:pl-24">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 md:px-10">
        <div className="flex flex-col pt-10 pb-8 md:pt-12 md:pb-10 items-center md:items-start md:pl-[140px]">
          <div className="flex flex-col items-center md:items-start">
            <div className="bg-primary w-6 h-0.5 lg:w-8 lg:h-1 mb-2" />
            <h2 className="text-base lg:text-lg font-medium tracking-wide text-white/90">
              {searching ? `Searched for: ${query || ""}` : trending ? "Trending" : "Latest"}
            </h2>
          </div>
        </div>
        <div className="flex flex-col">
          {loading ? <p role="status" className="text-sm text-white/70 md:pl-[140px]">Loading posts…</p> : error ? <p role="alert" className="text-sm text-red-400 md:pl-[140px]">{error}</p> : posts.length ? <Posts posts={posts} /> : <p className="text-sm text-white/70 md:pl-[140px]">No public posts found.</p>}
        </div>
      </div>
    </section>
  );
}
