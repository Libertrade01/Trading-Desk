export default function AnalyticsTable({ columns, rows, onRowClick, className = "" }) {
  const template = columns.map((c) => c.width || "1fr").join(" ");
  return (
    <div className={`an-table ${className}`.trim()}>
      <div className="an-table__head" style={{ gridTemplateColumns: template }}>
        {columns.map((col) => (
          <span
            key={col.key}
            className={`an-table__th${col.align === "right" ? " an-table__cell--right" : col.align === "center" ? " an-table__cell--center" : ""}`}
          >
            {col.label}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          className={`an-table__row${onRowClick ? " an-table__row--clickable" : ""}`}
          style={{ gridTemplateColumns: template }}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          role={onRowClick ? "button" : undefined}
          tabIndex={onRowClick ? 0 : undefined}
          onKeyDown={
            onRowClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") onRowClick(row);
                }
              : undefined
          }
        >
          {columns.map((col) => (
            <span
              key={col.key}
              className={`an-table__cell${col.align === "right" ? " an-table__cell--right" : col.align === "center" ? " an-table__cell--center" : ""}`}
              style={row.cellStyle?.[col.key]}
            >
              {row.cells[col.key]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
