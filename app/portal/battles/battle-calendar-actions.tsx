"use client";

import { CalendarPlus, Download } from "lucide-react";

type BattleCalendarItem = {
  id: string;
  creatorHandle: string | null;
  battleDate: string;
  timeEst: string;
  timeSort: string | null;
  opponentName: string | null;
  opponentAgency: string | null;
  diamondRange: string | null;
  league: string;
  lhsManager: string | null;
  updatedAt: string;
};

function timeParts(timeSort: string | null, timeEst: string) {
  if (timeSort) {
    const match = String(timeSort).match(/^(\d{1,2}):(\d{2})/);
    if (match) return { hour: Number(match[1]), minute: Number(match[2]) };
  }

  const clean = timeEst.replace(/\s+EST$/i, "").trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: 12, minute: 0 };

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

function localStamp(date: string, timeSort: string | null, timeEst: string, addMinutes = 0) {
  const [year, month, day] = date.split("-").map(Number);
  const { hour, minute } = timeParts(timeSort, timeEst);
  const value = new Date(Date.UTC(year, month - 1, day, hour, minute + addMinutes, 0));

  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
    "T",
    String(value.getUTCHours()).padStart(2, "0"),
    String(value.getUTCMinutes()).padStart(2, "0"),
    "00",
  ].join("");
}

function utcStamp(value: string) {
  const date = new Date(value);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return safe.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function displayHandle(value: string | null) {
  const clean = (value || "LHS Creator").trim();
  return clean.startsWith("@") ? clean : "@" + clean;
}

function eventTitle(battle: BattleCalendarItem) {
  return "LHS Battle: " + displayHandle(battle.creatorHandle) + " vs " + (battle.opponentName || "TBD");
}

function eventDescription(battle: BattleCalendarItem) {
  return [
    "LHS Creator Network Battle",
    "Creator: " + displayHandle(battle.creatorHandle),
    "Manager: " + (battle.lhsManager || "—"),
    "Opponent: " + (battle.opponentName || "TBD"),
    "Opponent Agency: " + (battle.opponentAgency || "—"),
    "Diamond Range: " + (battle.diamondRange || "—"),
    "League: " + battle.league,
    "LHS listed time: " + battle.timeEst,
    "",
    "Open Battle Central in LHS Connect for the latest schedule.",
  ].join("\n");
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function calendarFile(battle: BattleCalendarItem) {
  const start = localStamp(battle.battleDate, battle.timeSort, battle.timeEst);
  const end = localStamp(battle.battleDate, battle.timeSort, battle.timeEst, 60);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LHS Creator Network//Battle Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:America/New_York",
    "X-LIC-LOCATION:America/New_York",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "UID:lhs-battle-" + battle.id + "@lhs-connect",
    "DTSTAMP:" + utcStamp(new Date().toISOString()),
    "LAST-MODIFIED:" + utcStamp(battle.updatedAt),
    "DTSTART;TZID=America/New_York:" + start,
    "DTEND;TZID=America/New_York:" + end,
    "SUMMARY:" + escapeIcs(eventTitle(battle)),
    "DESCRIPTION:" + escapeIcs(eventDescription(battle)),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function googleCalendarUrl(battle: BattleCalendarItem) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", eventTitle(battle));
  url.searchParams.set(
    "dates",
    localStamp(battle.battleDate, battle.timeSort, battle.timeEst) +
      "/" +
      localStamp(battle.battleDate, battle.timeSort, battle.timeEst, 60),
  );
  url.searchParams.set("ctz", "America/New_York");
  url.searchParams.set("details", eventDescription(battle));
  return url.toString();
}

export function BattleCalendarActions({ battle }: { battle: BattleCalendarItem }) {
  function downloadIcs() {
    const blob = new Blob([calendarFile(battle)], { type: "text/calendar;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const creator = (battle.creatorHandle || "creator")
      .replace(/^@/, "")
      .replace(/[^a-z0-9_-]+/gi, "-");

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "LHS-Battle-" + battle.battleDate + "-" + (creator || "creator") + ".ics";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return (
    <div className="battle-calendar-actions">
      <a
        className="calendar-action google"
        href={googleCalendarUrl(battle)}
        target="_blank"
        rel="noreferrer"
        aria-label="Add this battle to Google Calendar"
      >
        <CalendarPlus size={15} /> Google
      </a>
      <button
        className="calendar-action apple"
        type="button"
        onClick={downloadIcs}
        aria-label="Add this battle to Apple Calendar or iCal"
      >
        <Download size={15} /> Apple / iCal
      </button>
    </div>
  );
}