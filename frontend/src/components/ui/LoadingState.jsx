export default function LoadingState({ text = 'Đang tải...' }) {
  return (
    <div className="loading-state">
      <div className="spinner spinner-lg"></div>
      <span>{text}</span>
    </div>
  );
}
