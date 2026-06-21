"use client";

const GOAL = 21;

export default function ProcessStreaksPanel({ riskStreak, playbookStreak }) {
  return (
    <div className="analytics-streaks">
      <div className="analytics-streak">
        <div className="analytics-streak__label">Risk plan streak</div>
        <div className="analytics-streak__value analytics-streak__value--risk">
          {riskStreak}
          <span className="analytics-streak__goal">/{GOAL}</span>
        </div>
      </div>
      <div className="analytics-streak analytics-streak--divider">
        <div className="analytics-streak__label">Playbook streak</div>
        <div className="analytics-streak__value analytics-streak__value--playbook">
          {playbookStreak}
          <span className="analytics-streak__goal">/{GOAL}</span>
        </div>
      </div>
    </div>
  );
}
