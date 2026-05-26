import React from 'react';

const RiskCard = ({ title, value, description, isHighRisk }) => {
  return (
    <div className={`p-6 rounded-2xl border-2 shadow-sm transition-all hover:shadow-md ${
      isHighRisk ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
    }`}>
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      <p className={`text-3xl font-black my-3 ${isHighRisk ? 'text-red-600' : 'text-blue-600'}`}>
        {value}
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
};

export default RiskCard;