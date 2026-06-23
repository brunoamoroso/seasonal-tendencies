import { ChartContainer, type ChartConfig } from '#/components/ui/chart';
import { createFileRoute } from '@tanstack/react-router';
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';

export const Route = createFileRoute('/')({ component: Home });

const chartData = [{
  month: 'January',
  value: 30,
}, {
  month: 'February',
  value: 20,
}, {
  month: 'March',
  value: 50,
}, {
  month: 'April',
  value: 40,
}, {
  month: 'May',
  value: 60,
}, {
  month: 'June',
  value: 70,
}, {
  month: 'July',
  value: 80,
}, {
  month: 'August',
  value: 90,
}, {
  month: 'September',
  value: 100,
}, {
  month: 'October',
  value: 110,
}, {
  month: 'November',
  value: 120,
}, {
  month: 'December',
  value: 130,
}];

const chartConfig = {
  value: {
    label: "Value",
    color: "#8884d8",
  }
} satisfies ChartConfig;

function Home() {
  return (
    <div className="w-full flex min-h-screen justify-center items-center">
      <div className="w-10/12 flex flex-col">
        <h1>Seasonal Tendencies</h1>
        <ChartContainer config={chartConfig} className="w-full h-96">
          <LineChart accessibilityLayer data={chartData} margin={{left: 48, right: 48}}>
            <CartesianGrid vertical={false}/>
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8}/>
            <Line dataKey="value" stroke="#8884d8"></Line>
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  )
}
