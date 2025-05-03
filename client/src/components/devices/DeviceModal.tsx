import React, { useState } from 'react';

import { X } from 'lucide-react';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: any) => void;
}

const DeviceModal: React.FC<DeviceModalProps> = ({ isOpen, onClose, onSave }) => {
  const [deviceData, setDeviceData] = useState({
    name: '',
    ip: '',
    port: '502',
    slaveId: '1',
    enabled: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setDeviceData({
      ...deviceData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(deviceData);
    setDeviceData({
      name: '',
      ip: '',
      port: '502',
      slaveId: '1',
      enabled: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Add New Device</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="name">
              Device Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={deviceData.name}
              onChange={handleChange}
              className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
              placeholder="Enter device name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="ip">
              IP Address
            </label>
            <input
              type="text"
              id="ip"
              name="ip"
              value={deviceData.ip}
              onChange={handleChange}
              className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
              placeholder="192.168.1.100"
              required
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="port">
                Port
              </label>
              <input
                type="number"
                id="port"
                name="port"
                value={deviceData.port}
                onChange={handleChange}
                className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
                placeholder="502"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="slaveId">
                Slave ID
              </label>
              <input
                type="number"
                id="slaveId"
                name="slaveId"
                value={deviceData.slaveId}
                onChange={handleChange}
                className="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
                placeholder="1"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="enabled"
                checked={deviceData.enabled}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm font-bold text-gray-700">Enabled</span>
            </label>
          </div>

          <div className="flex justify-end border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            >
              Add Device
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceModal;
