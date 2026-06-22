import { FC } from 'react';

const Fallback: FC = () => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-4">
        Under Construction...
      </h1>
      <p className="text-gray-600">
        This page is under construction.
      </p>
    </div>
  );
};

export default Fallback;
