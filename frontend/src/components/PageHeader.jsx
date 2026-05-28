export default function PageHeader({ title, description, children, badge }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {badge && (
          <span className="inline-block mb-2 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-100 rounded">
            {badge}
          </span>
        )}
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-gray-500 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
