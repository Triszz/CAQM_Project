function Item({ title, value, unit, itemQuality, desc }) {
  return (
    <div className="item-container">
      <span className="item-title">{title}</span>
      <div className="value-unit-container">
        <span className="item-value">{value}</span>
        <span className="item-unit">{unit}</span>
      </div>
      {itemQuality === "TỐT" ? (
        <span className="item-quality item-good-quality">{itemQuality}</span>
      ) : itemQuality === "TRUNG BÌNH" ? (
        <span className="item-quality item-medium-quality">{itemQuality}</span>
      ) : itemQuality === "TỆ" ? (
        <span className="item-quality item-bad-quality">{itemQuality}</span>
      ) : (
        <span className="item-quality">{itemQuality}</span>
      )}
      <span className="item-desc">{desc}</span>
    </div>
  );
}
export default Item;
