import React from 'react';

interface Register {
  name: string;
  address: number;
  length: number;
  scaleFactor?: number;
  decimalPoint?: number;
  byteOrder?: string;
  unit?: string;
}

interface RegisterTableProps {
  registers: Register[];
}

const RegisterTable: React.FC<RegisterTableProps> = ({ registers }) => {
  if (!registers || registers.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-6 text-center">
        <p className="text-gray-500">No registers configured for this device</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Address
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Length
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Scale Factor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Decimal Point
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Byte Order
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Unit
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {registers.map((register, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {register.name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {register.address}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {register.length}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {register.scaleFactor ?? 1}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {register.decimalPoint ?? 0}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {register.byteOrder ?? 'AB CD'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {register.unit || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RegisterTable;
