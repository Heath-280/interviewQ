import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { titleCase } from '@/lib/format';

export function CategoryBars({
  data,
}: {
  data: { category: string; average: number; count: number }[];
}) {
  const chartData = data.map((item) => ({
    name: titleCase(item.category),
    average: item.average,
    count: item.count,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
              fontSize: 12,
            }}
            formatter={(value: number, _name, entry) => [
              `${value}/100 (${(entry.payload as { count: number }).count} answers)`,
              'Average',
            ]}
          />
          <Bar dataKey="average" radius={[8, 8, 0, 0]} maxBarSize={64}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  entry.average >= 75
                    ? 'hsl(var(--success))'
                    : entry.average >= 50
                      ? 'hsl(38 92% 50%)'
                      : 'hsl(var(--destructive))'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
