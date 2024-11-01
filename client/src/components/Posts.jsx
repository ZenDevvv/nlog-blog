import React, { useEffect } from 'react'
import dayjs from "dayjs"; // Import dayjs
import { Link } from 'react-router-dom';
import axios from 'axios';
const SERVER = import.meta.env.VITE_DEV_SERVER;


export default function Posts({posts}) {
    const getText = (html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        return doc.body.textContent;
      };
  

  return (
    <div>
      {posts.map((post) => {
          const formattedDate = dayjs(post.updated_at)
            .format("MMMM DD, YYYY")
            .toUpperCase();

          return (
            <div key={post.post_id} className="md:flex gap-4 min-h-[120px]">
              <div className="pt-2 text-sm justify-between hidden md:flex flex-col md:justify-start md:pt-0">
                <p className="text-end text-3xl">
                  {formattedDate.split(" ")[1].replace(",", "")}
                </p>
                <p className="text-end text-3xl">
                  {formattedDate.split(" ")[0]}
                </p>
                <a
                  href=""
                  className="font-light text-end -rotate-90 translate-x-[60px] translate-y-16 hover:underline"
                >
                  @{post.username}
                </a>
              </div>

              <div className="w-full">
                <h1 className="w-fit pb-1 text-primary font-serif text-xl md:text-3xl lg:text-4xl md:pb-4  hover:pl-2 transition-padding duration-200">
                  <Link to={`/post/${post.post_id}`}>{post.title}</Link>
                </h1>

                <p className="text-xs font-light md:text-lg lg:text-xl line-clamp-4">
                  {getText(post.content)}
                </p>

                {/* <Truncate
                    className="text-sm font-light md:text-lg"
                    lines={4}
                    ellipsis={
                      <span
                        onClick={() => setIsTruncated(!isTruncated)}
                        className="cursor-pointer text-primary"
                      >
                        <a> ... Read more</a>
                      </span>
                    }
                  >
                    <p>{post.content}</p>
                  </Truncate> */}
 
                <div className="pt-2 text-sm flex justify-between md:hidden">
                  <p>{formattedDate}</p>

                  <Link to={`/profile/${post.user_id}`}>
                    <p href="" className="font-extralight hover:underline">
                      @{post.username}
                    </p>
                  </Link>
                </div>

                <ul className="flex gap-2 py-4 flex-wrap">
                  {post.tags?.split(",").map((tag, id) => {
                    return (
                      <Link key={id} to={`/?tag=${tag}`}>
                        <li className="text-xs lg:text-base text-primary border-[1px] font-light border-primary px-4 py-1 rounded-full hover:-translate-y-0.5 duration-200">
                          #{tag}
                        </li>
                      </Link>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
    </div>
  )
}
