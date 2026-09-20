export default function QuestionField({ q, value, onChange, error }) {
  const name = `q-${q.id}`;

  const toggle = (opt) => {
    const cur = Array.isArray(value) ? value : [];
    onChange(cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]);
  };

  return (
    <fieldset className={`question ${error ? 'has-error' : ''}`}>
      <legend>
        {q.label}
        {q.required && <b className="req"> *</b>}
      </legend>

      {q.type === 'single' &&
        q.options.map((opt) => (
          <label key={opt} className={`choice ${value === opt ? 'on' : ''}`}>
            <input type="radio" name={name} checked={value === opt} onChange={() => onChange(opt)} />
            <span>{opt}</span>
          </label>
        ))}

      {q.type === 'multi' &&
        q.options.map((opt) => {
          const on = Array.isArray(value) && value.includes(opt);
          return (
            <label key={opt} className={`choice ${on ? 'on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(opt)} />
              <span>{opt}</span>
            </label>
          );
        })}

      {q.type === 'scale' && (
        <div className="scale">
          <div className="scale-buttons">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={value === n ? 'on' : ''}
                aria-pressed={value === n}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="scale-legend">
            <span>{q.minLabel}</span>
            <span>{q.maxLabel}</span>
          </div>
        </div>
      )}

      {q.type === 'text' && (
        <textarea rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Nhập câu trả lời…" />
      )}

      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}
