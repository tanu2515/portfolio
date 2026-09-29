export default function Loader({ full }) {
  return (
    <div className={full ? 'loader loader-full' : 'loader'}>
      <span className="spinner" aria-label="Loading" />
    </div>
  );
}
