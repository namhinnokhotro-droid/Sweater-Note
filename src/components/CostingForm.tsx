import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CostingDetails } from '../types';

interface CostingFormProps {
  costing: CostingDetails;
  onChange: (costing: CostingDetails) => void;
}

export const CostingForm: React.FC<CostingFormProps> = ({ costing, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    onChange({
      ...costing,
      [name]: type === 'number' ? (parseFloat(value) || 0) : value,
    });
  };

  const calculateTotal = () => {
    const customTotal = (costing.customOptions || []).reduce((acc, opt) => acc + (opt.value || 0), 0);
    
    const rawCost = 
      costing.pocket +
      costing.stitch +
      costing.shoulder +
      costing.armhole +
      costing.sidejoint +
      costing.neck +
      costing.hood +
      costing.paiping +
      costing.placket +
      costing.ribCuff +
      costing.bottom +
      costing.vJoint +
      costing.pottyJoint +
      costing.sample +
      costing.complete +
      costing.body +
      costing.newOption +
      customTotal;
    
    return {
      rawCost,
      total: rawCost
    };
  };

  const totals = calculateTotal();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Style Number</label>
        <input
          type="text"
          name="styleNumber"
          value={costing.styleNumber}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
          placeholder="e.g. SN-2024-01"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        {/* Production Components */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Pocket (৳)</label>
          <input
            type="number"
            name="pocket"
            value={costing.pocket}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Stitch (৳)</label>
          <input
            type="number"
            name="stitch"
            value={costing.stitch}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Shoulder (৳)</label>
          <input
            type="number"
            name="shoulder"
            value={costing.shoulder}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Armhole (৳)</label>
          <input
            type="number"
            name="armhole"
            value={costing.armhole}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Sidejoint (৳)</label>
          <input
            type="number"
            name="sidejoint"
            value={costing.sidejoint}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Neck (৳)</label>
          <input
            type="number"
            name="neck"
            value={costing.neck}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Hood (৳)</label>
          <input
            type="number"
            name="hood"
            value={costing.hood}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Paiping (৳)</label>
          <input
            type="number"
            name="paiping"
            value={costing.paiping}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Placket (৳)</label>
          <input
            type="number"
            name="placket"
            value={costing.placket}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Rib+Cuff (৳)</label>
          <input
            type="number"
            name="ribCuff"
            value={costing.ribCuff}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Bottom (৳)</label>
          <input
            type="number"
            name="bottom"
            value={costing.bottom}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">V. Joint (৳)</label>
          <input
            type="number"
            name="vJoint"
            value={costing.vJoint}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Potty Joint (৳)</label>
          <input
            type="number"
            name="pottyJoint"
            value={costing.pottyJoint}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Sample (৳)</label>
          <input
            type="number"
            name="sample"
            value={costing.sample}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Complete (৳)</label>
          <input
            type="number"
            name="complete"
            value={costing.complete}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Body (৳)</label>
          <input
            type="number"
            name="body"
            value={costing.body}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">New Option (৳)</label>
          <input
            type="number"
            name="newOption"
            value={costing.newOption}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Dynamic Custom Options */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Custom Options</h4>
          <button
            onClick={() => {
              const opts = [...(costing.customOptions || [])];
              opts.push({ id: uuidv4(), name: '', value: 0 });
              onChange({ ...costing, customOptions: opts });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-all"
          >
            <Plus size={14} /> Add More
          </button>
        </div>

        {(costing.customOptions || []).map((opt) => (
          <div key={opt.id} className="grid grid-cols-[1fr_100px_40px] gap-2 items-end">
            <div className="space-y-1">
              <input
                type="text"
                value={opt.name}
                placeholder="Option Name (e.g. Logo)"
                onChange={(e) => {
                  const opts = costing.customOptions!.map(o => o.id === opt.id ? { ...o, name: e.target.value } : o);
                  onChange({ ...costing, customOptions: opts });
                }}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <input
                type="number"
                value={opt.value || ''}
                placeholder="0.00"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const opts = costing.customOptions!.map(o => o.id === opt.id ? { ...o, value: val } : o);
                  onChange({ ...costing, customOptions: opts });
                }}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-bold text-center"
              />
            </div>
            <button
              onClick={() => {
                const opts = costing.customOptions!.filter(o => o.id !== opt.id);
                onChange({ ...costing, customOptions: opts });
              }}
              className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {(!costing.customOptions || costing.customOptions.length === 0) && (
          <p className="text-[10px] text-slate-400 font-bold italic text-center py-2">No custom options added (অন্যান্য খরচ নেই)</p>
        )}
      </div>

      <div className="pt-6 border-t border-slate-100">
        <h3 className="font-bold text-lg text-slate-800 mb-4">Costing Summary</h3>
        <div className="space-y-3">
          <div className="mt-4 p-5 bg-slate-800 rounded-2xl text-white shadow-xl shadow-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Total Manufacturing Price</p>
                <p className="font-medium text-indigo-300 text-xs">Sum of all components</p>
              </div>
              <span className="text-3xl font-bold font-sans tracking-tight">৳ {totals.total.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
