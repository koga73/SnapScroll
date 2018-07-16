# SnapScroll
jQuery plugin which auto-snaps to elements while scrolling

```html
<header>HEADER</header>
<div>
	<section>Section 1</section>
	<section>Section 2</section>
	<section>Section 3</section>
</div>
<footer>FOOTER</footer>
```

```javascript
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
<script src="js/snap-scroll.js"></script>
<script>
	$("header, section, footer").SnapScroll();
</script>
```