import React from "react";
import { MdOutlineNotificationsActive } from "react-icons/md";
import { motion as m, AnimatePresence } from "framer-motion";

export default function Notif({ error, success }) {
  return (
    <>
      <AnimatePresence>
        {error && (
          <m.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            className="absolute top-0 w-full lg:right-0 lg:w-[600px] z-[9999]"
          >
            <div className="flex justify-between items-center text-darkBg bg-[#FF5E5B] m-4 px-6 py-2 lg:m-12 lg:px-10 lg:py-6">
              <div>
                <p className="font-bold">FAILED</p>
                <p>{error}</p>
              </div>
              <MdOutlineNotificationsActive className="text-3xl lg:text-4xl" />
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <m.div
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            className="absolute top-0 w-full lg:right-0 lg:w-[600px] z-40"
          >
            <div className="flex justify-between items-center text-darkBg bg-primary m-4 px-6 py-2 lg:m-12 lg:px-10 lg:py-6">
              <div>
                <p className="font-bold">SUCCESS</p>
                <p>{success}</p>
              </div>
              <MdOutlineNotificationsActive className="text-3xl lg:text-4xl" />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
