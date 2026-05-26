import React from 'react';

const RiskCard = ({ title, value, description, isHighRisk }) => {
  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
      isHighRisk
        ? 'border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30'
        : 'border-blue-200 bg-blue-50 dark:border-blue-900/70 dark:bg-blue-950/30'
    }`}>
      <h3 className="text-xs font-black uppercase text-slate-500 tracking-normal dark:text-slate-400">{title}</h3>
      <p className={`my-3 text-3xl font-black ${isHighRisk ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300'}`}>
        {value}
      </p>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
};

export default RiskCard;
