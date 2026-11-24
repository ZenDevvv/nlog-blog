import React, { useEffect } from "react";
import dayjs from "dayjs"; // Import dayjs
import { Link } from "react-router-dom";
import axios from "axios";
const SERVER = import.meta.env.VITE_DEV_SERVER;
import { delay, motion as m } from "framer-motion";

export default function Posts({ posts }) {
  const getText = (html) => {
    if (!html) return "";
    const spaced = html.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote)[^>]*>/gi, " ");
    const doc = new DOMParser().parseFromString(spaced, "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  };

  return (
    <div className="flex flex-col gap-8 md:gap-10 overflow-x-hidden">
      {posts.map((post, idx) => {
        const formattedDate = dayjs(post.updated_at)
          .format("MMMM DD, YYYY")
          .toUpperCase();

        return (
          <m.article
            initial={{ x: "-50%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.06 * idx }}
            key={post.post_id}
            className="md:flex gap-6 pb-8 md:pb-10 border-b border-white/10 last:border-b-0"
          >
            <div className="hidden md:flex flex-col md:w-[116px] shrink-0 pt-1 text-right">
              <p className="text-2xl font-medium leading-none text-white/90">
                {formattedDate.split(" ")[1].replace(",", "")}
              </p>
              <p className="text-xs tracking-[0.14em] uppercase text-white/55 mt-1">
                {formattedDate.split(" ")[0]}
              </p>

              <Link to={`/profile/${post.user_id}`} className="mt-2">
                <p className="text-xs font-light text-white/60 hover:text-primary hover:underline">
                  @{post.username}
                </p>
              </Link>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="w-fit pb-1.5 text-primary font-serif text-xl md:text-2xl lg:text-[26px] leading-snug hover:translate-x-1 transition-transform duration-200">
                <Link to={`/post/${post.post_id}`}>{post.title}</Link>
              </h1>

              <p className="text-sm md:text-[15px] lg:text-base leading-relaxed text-white/80 line-clamp-3">
                {getText(post.content)}
              </p>

              {post.image_url && (
                <Link
                  to={`/post/${post.post_id}`}
                  className="block mt-3.5 overflow-hidden rounded-lg border border-white/10 bg-black/20"
                >
                  <img
                    src={post.image_url}
                    alt={post.title}
                    loading="lazy"
                    className="w-full max-h-[300px] object-cover hover:scale-[1.01] transition-transform duration-300"
                  />
                </Link>
              )}

              <div className="pt-2.5 text-xs font-light text-white/55 flex justify-between md:hidden">
                <p>{formattedDate}</p>

                <Link to={`/profile/${post.user_id}`}>
                  <p className="hover:underline">
                    @{post.username}
                  </p>
                </Link>
              </div>

              {post.tags && (
                <ul className="flex gap-2 pt-3.5 flex-wrap">
                  {post.tags?.split(",").map((tag, id) => {
                    return (
                      <Link key={id} to={`/?tag=${tag}`}>
                        <li className="text-xs text-primary/90 border border-primary/50 hover:border-primary font-light px-3 py-0.5 rounded-full hover:-translate-y-0.5 transition duration-200">
                          #{tag}
                        </li>
                      </Link>
                    );
                  })}
                </ul>
              )}
            </div>
          </m.article>
        );
      })}
    </div>
  );
}
