import { useEffect, useCallback, useState } from "react";

export function useHomeworkNotifications(homeworkList = []) {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  // Check homework urgency and send notifications
  useEffect(() => {
    if (permission !== "granted") return;

    const urgent = homeworkList.filter((hw) => hw.daysLeft <= 2 && hw.daysLeft >= 0);
    if (urgent.length === 0) return;

    // Only notify once per session per homework
    const notifiedKey = "hw_notified_" + new Date().toDateString();
    const already = JSON.parse(sessionStorage.getItem(notifiedKey) || "[]");

    urgent.forEach((hw) => {
      if (already.includes(hw.title)) return;

      const tag = hw.daysLeft === 0 ? "⚠️ Due Today" : hw.daysLeft === 1 ? "⏰ Due Tomorrow" : `📅 ${hw.daysLeft} days left`;

      new Notification("Homework Reminder", {
        body: `${hw.title} — ${tag}`,
        icon: "/favicon.ico",
        tag: hw.title,
      });

      already.push(hw.title);
    });

    sessionStorage.setItem(notifiedKey, JSON.stringify(already));
  }, [permission, homeworkList]);

  return { permission, requestPermission };
}
