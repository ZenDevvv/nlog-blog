import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import dayjs from "dayjs"; // Import dayjs
import { useLocation, useNavigate } from "react-router-dom";
import Posts from "../components/Posts";
const SERVER = import.meta.env.VITE_DEV_SERVER;

const formatDate = (date) => {
  return dayjs(date).format("MMMM DD, YYYY");
};

export default function Profile() {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const [posts, setPosts] = useState({});
  const [settings, setSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const userID = location.pathname.split("/").pop();

  useEffect(() => {
    setLoading(true);
    const getUser = async () => {
      console.log("profile")
      try {
        const res = await axios.get(`${SERVER}/profile/${userID}`);
        const sortedPosts = res.data.sort(
          (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
        );
        setPosts(sortedPosts);
        setLoading(false);
      } catch (err) {
        console.log(err);
      }
    };

    getUser();
  }, [userID]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${SERVER}/auth/logout`,
        {},
        { withCredentials: true }
      );
      console.log(res.data);
      setCurrentUser(null);
      navigate("/login");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      {loading ? (
        "Loading... "
      ) : (
        <div>
          <div className="relative">
            {currentUser.id === posts[0].id && (
              <button
                onClick={() => setSettings(!settings)}
                className="text-white absolute top-0 right-0 pr-4 font-extrabold focus:outline-none"
              >
                . . .
              </button>
            )}

            {settings && (
              <ul className="text-white absolute right-3 top-7 bg-[#313131] px-4 py-1 rounded-md">
                <li>
                  <button onClick={handleLogout}>Logout</button>
                </li>
              </ul>
            )}
          </div>

          <div className="text-white pt-8 flex flex-col pb-[100px] md:pb-[110px] lg:pl-32 lg:pr-16 xl:pl-[200px] xl:pr-28  max-w-[1600px] mx-auto">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-primary w-[150px] aspect-square rounded-full grid place-content-center">
                <span className="text-7xl">
                  {posts[0] && posts[0].username
                    ? posts[0].username[0].toUpperCase()
                    : ""}
                </span>
              </div>
              <h2 className="text-2xl">@{posts[0]?.username}</h2>
              <p className="text-[#A5A5A5]">
                Joined since {formatDate(posts[0]?.created_at)}.
              </p>
            </div>

            <div className="flex flex-col items-center my-8">
              <div className="bg-primary w-5 h-1 lg:w-10 lg:h-1"></div>
              <h2 className="text-sm  lg:text-2xl">Posts</h2>
            </div>

            <div className="flex flex-col gap-6 px-6  md:gap-10 lg:gap-14 pb-20 md:pb-[130px]">
              {posts[0] && <Posts posts={posts} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
