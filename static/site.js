var cache = {};
var filters = {};

const category_selectors = [
	'o_Motiven',
	'o_Paraphrasen',
	'o_Technik',
	'o_Helligkeit',
	'o_Farbigkeit',
	'o_Ausrichtung',
	'o_Serie',
	'o_Grösse',
	'o_Gegenständlich/Ungegenständlich',
	'o_Darstellungsformen',
	'o_Komposition'
];


(function () {

	$.getJSON('/api/filters/all.json', function (jsondata) {
		cache = jsondata;
		cache.forEach(function (d) {
			dm = d.Mode.toLowerCase();
			if (!filters[dm])
				filters[dm] = [];
			if (!filters[dm].includes(d.Type))
				filters[dm].push(d.Type);
		});

		Object.keys(filters).forEach(function (f) {
			initFilterSections(f);
		});
		listTitles();
		applySearchFromURL();

	}).fail(function () {
		alert('Fehler: Daten konnten nicht geladen werden.');
	});

	// Apply fancy polar button effect
	$('.btn-polar').each(function() {
        const buttonText = $(this).text();
        const newContent = `
            <span>${buttonText}</span>
            <div class="marquee" aria-hidden="true">
                <div class="marquee-inner">
                    <span>${buttonText}</span><span>${buttonText}</span>
                    <span>${buttonText}</span><span>${buttonText}</span>
                    <span>${buttonText}</span><span>${buttonText}</span>
                    <span>${buttonText}</span><span>${buttonText}</span>
                </div>
            </div>
        `;
        $(this).html(newContent);
    });

	function initFilterSections(sname) {
		// Add section headers
		console.log("Init sections", sname);
		loadSavedItems();

		let id = "";
		switch (sname) {
			case 'anderes':
				id = "#titleSearch"
				break;
			case 'inhalt':
				id = "#contentSearch"
				break;
			case 'form':
				id = "#formSearch"
				break;
			default:
				break;
		}

		$(id).each(function () {
			var $tgt = $(this);
			filters[sname].forEach(function (i) {
				if ($('div[data-tag="' + sname + '"]').attr('data-type') == i)
					return;
				var allOfType = cache.filter(c => c.Type === i)
				var allCodes = allOfType.map(c => c.Code);
				var filter = allCodes.join('|');
				$tgt.append(
					'<h5 class="group-title"><input type="checkbox" id="group_' + i + '"name="o_' + allOfType[0].Column + '" value="' + filter + '">&nbsp;<label for="group_' + i + '">' + i + '</label></h5>' +
					'<div class="form-group row" ' +
					'data-tag="' + sname + '" ' +
					'data-type="' + i + '"></div>'
				);
			});
		});

		// Subset the data
		var data = cache.filter(function (i) {
			return i.Mode.toLowerCase() == sname.toLowerCase();
		});

		// Process any tags
		$('div[data-tag="' + sname + '"]').each(function () {
			renderForm($(this), data);
		});
	}

	function getAttrOrDefault(attr, defaultval) {
		if (typeof attr !== typeof undefined && attr !== false) {
			return attr;
		} else {
			return defaultval;
		}
	}

	function renderForm($out, dp) {
		var wtype = $out.attr('data-type'),
			inputtype = getAttrOrDefault($out.attr('data-input'), 'checkbox');
	
		// Filter data based on type
		data = dp.filter(function (i) {
			return i.Type.toLowerCase() == wtype.toLowerCase();
		});
	
		// Append "form-check" divs directly to $out
		$.each(data, function () {
			$out.append(
				'<div class="form-check">' +
					(this.Code == null ? '&nbsp;' :
						'<input class="form-check-input" ' +
						'id="o_' + this.Column + this.Code + '" ' +
						'name="o_' + this.Column + '" ' +
						'value="' + this.Code + '" ' +
						'type="' + inputtype + '">' +
						'<label class="form-check-label" ' +
						'for="o_' + this.Column + this.Code + '">' +
						this.Title +
						(this.Count == 0 ? '' :
							'&nbsp;<span class="badge badge-light badge-pill count">' + this.Count + '</span> ') +
						'</label>') +
				'</div>'
			);
		});
	}

	function titleSearch(e) {
		console.log("titleSearch");
		
		$('input[name="Jahr"]').val(''); // Copies Entry to html input form
		$('input[name="Titel"]').val(this.innerHTML); // Copies Entry to html input form
		werkSearchCount();
	}

	function yearSearch(e) {
		$('input[name="Titel"]').val(''); // Copies Entry to html input form
		$('input[name="Jahr"]').val(this.innerHTML); // Copies Entry to html input form
		werkSearchCount();
	}

	// Run search
	$('#start').on('click', function(e) {
		e.preventDefault(); 
		e.stopPropagation();
		werkSearchStart();
		$("#worksMenuItem").click(); // Switch tab
	});

	// Random search
	$('#random').click(werkSearchRandom); // -button.click

	// Reset search
	$('#restart').on('click', { resetPage: false }, werkSearchReset);
	$('#restartAll').on('click', function() {
		werkSearchReset();
		$("#searchMenuItem").click(); // Switch tab
	});

	// Pagination
	$('#more').click(werkSearchNext);

	// Title, Year Search
	$('#contentAreaTitle').on('click', 'div', titleSearch);
	$('#contentAreaYear').on('click', 'div', yearSearch);

	// Main nav tabs
	$('.main-nav-item').click(function () {
		$('.main-nav .main-nav-item').removeClass('active');
		$('.main .main-pane').removeClass('active');
		$(this).addClass('active');
		var activeSection = $(this).attr("href");
		$(activeSection).addClass('active');
		$('html, body').animate({ scrollTop: 0 }, 'fast');
	});

	// Search tab styling on click
	$('#search .nav-link').click(function () {
		$('#search .nav-item.nav-link').removeClass('active');
	});

	// Counter on click
	$('form').change(function () {
		$('input[name="Titel"]').val('');
		werkSearchCount();
	});

	// Save all result images
	$('#selectAllResults').on('click', function (e) {
		e.preventDefault();
		e.stopPropagation();
		$('.check').prop('checked', true);
		$('.check').trigger('change');
	});

	// Delete local storage -> Delete saved images
	$('#deleteSavedList').on('click', function (e) {
		e.preventDefault(); 
		e.stopPropagation();
		localStorage.removeItem('selectedItems');
		loadSavedItems();
	});

	// Export list
	$('#exportSavedList').on('click', function (e) {
		e.preventDefault(); 
		e.stopPropagation();
		const data = localStorage.getItem('selectedItems');  
		const jsonData = data;
		const blob = new Blob([jsonData], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'data.json'; 
		link.click();
		URL.revokeObjectURL(url);
	});

	$('#importSavedList').on('click', function (e) {
		e.preventDefault(); 
		e.stopPropagation();
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json';
		input.onchange = async (event) => {
			const file = event.target.files[0];
			if (!file) return;
			try {
				const text = await file.text();
				localStorage.setItem('selectedItems', text);
				loadSavedItems();
			} catch (error) {
				console.error('Error parsing JSON:', error);
				alert('Fehler beim importieren der Liste');
			}
		}
		input.click();
	});
})();



function updateURLWithSearchString(searchString) {
	if (history.pushState) {
		var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + searchString;
		window.history.pushState({ path: newUrl }, '', newUrl);
	}
}

function applySearchFromURL() {
	var params = {};
	var searchStr = window.location.search;
	if (searchStr) {
		var pairs = searchStr.substring(1).split("&");
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i].split("=");
			params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
		}
	}
	applyURLsearch = false
	category_selectors.forEach(function (category) {
		if (params[category]) {
			// Split the parameter by '|' to get the individual values
			var values = params[category].split('|');
			applyURLsearch = true;
			// Use the constructed ID to check each corresponding checkbox or input
			values.forEach(function (value) {
				var inputID = category + value;
				$('#' + inputID).prop('checked', true);
				console.log("checked:" + inputID);
			});
		}
	});
	// Trigger the search if params have been found
	if (applyURLsearch) {
		werkSearchStart(null, 1, false, true);
		$("#worksMenuItem").click();
	}
}