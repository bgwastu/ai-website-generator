"use client";

import { motion } from "framer-motion";
import { BotIcon, UserIcon } from "./icons";
import { ReactNode } from "react";
// Removed ai/rsc imports: StreamableValue, useStreamableValue
// Removed Markdown import as it was only used in TextStreamMessage

// Removed TextStreamMessage component

export const Message = ({
  role,
  content,
}: {
  role: "assistant" | "user";
  content: ReactNode; // Content from useChat is already ReactNode or string
}) => {
  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-1 w-full">
        <div className="text-zinc-800 dark:text-zinc-300 flex flex-col gap-4">
          {content}
        </div>
      </div>
    </motion.div>
  );
};
