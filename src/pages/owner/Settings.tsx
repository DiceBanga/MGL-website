import React from 'react';
import { Link } from 'react-router-dom';
import { Save, Bell, Shield, Mail, Globe, Database, Key, Home, User2 } from 'lucide-react';

function AdminSettings() {
  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <Link to="/admin" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Admin Panel
            </Link>
            <Link to="/dashboard" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <User2 className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
          </div>
          <button className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
            <Save className="w-5 h-5 mr-2" />
            Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* General Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Globe className="w-6 h-6 mr-2 text-green-500" />
              General Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  defaultValue="Militia Gaming League"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Site Description
                </label>
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  defaultValue="The premier NBA 2K esports league platform"
                />
              </div>
            </div>
          </div>

          {/* Email Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Mail className="w-6 h-6 mr-2 text-green-500" />
              Email Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SMTP Port
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-green-500" />
              Security Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="2fa"
                  className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
                />
                <label htmlFor="2fa" className="ml-2 text-sm text-gray-300">
                  Enable Two-Factor Authentication
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="login-notification"
                  className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
                />
                <label htmlFor="login-notification" className="ml-2 text-sm text-gray-300">
                  Email notification on new login
                </label>
              </div>
            </div>
          </div>

          {/* API Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Key className="w-6 h-6 mr-2 text-green-500" />
              API Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-l-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    value="••••••••••••••••"
                    readOnly
                  />
                  <button className="bg-green-700 text-white px-4 py-2 rounded-r-md hover:bg-green-600">
                    Generate New
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Webhook URL
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Bell className="w-6 h-6 mr-2 text-green-500" />
              Notification Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Email Notifications</h3>
                  <p className="text-sm text-gray-400">Receive email updates about your account</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="email-notifications"
                    className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Push Notifications</h3>
                  <p className="text-sm text-gray-400">Receive push notifications about your account</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="push-notifications"
                    className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;