interface CoinInfoProps {
  symbol: string;
}

export const CoinInfo = ({ symbol }: CoinInfoProps) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="text-sm text-gray-400">Last Price</div>
      <div className="text-xl font-bold">$0.00</div>
      
      <div className="mt-2">
        <div className="text-sm text-gray-400">24h Change</div>
        <div className="text-green-500">+0.00%</div>
      </div>
    </div>
  );
}; 