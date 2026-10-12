/* =====================================================
   W3CARE DASHBOARD
===================================================== */

/* =====================================================
   LOGIN CONFIG
===================================================== */

const LOGIN_USERNAME = "admin";

const LOGIN_PASSWORD = "2010";

const SESSION_KEY = "w3careDashboardLoggedIn";

const REFRESH_INTERVAL = 60000;

/* =====================================================
   GLOBAL STATE
===================================================== */

let allProjects = [];

let filteredProjects = [];

let charts = {};

let refreshTimer = null;

/* =====================================================
   DOM
===================================================== */

function $(id) {
  return document.getElementById(id);
}

/* =====================================================
   START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  setupLogin();

  setupNavigation();

  setupMobileNavigation();

  setupFilters();

  setupRefresh();

  setupKeyboard();

  loadData();
});

/* =====================================================
   LOGIN
===================================================== */

function setupLogin() {
  const loginScreen = $("loginScreen");

  const app = $("app");

  const loginForm = $("loginForm");

  const username = $("loginUsername");

  const password = $("loginPassword");

  const error = $("loginError");

  const toggle = $("togglePassword");

  /* EXISTING SESSION */

  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    loginScreen.classList.add("hidden");

    app.classList.remove("hidden");
  }

  /* LOGIN */

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const enteredUsername = username.value.trim();

    const enteredPassword = password.value;

    if (
      enteredUsername === LOGIN_USERNAME &&
      enteredPassword === LOGIN_PASSWORD
    ) {
      sessionStorage.setItem(SESSION_KEY, "true");

      error.classList.remove("show");

      loginScreen.classList.add("hidden");

      app.classList.remove("hidden");

      loadData();
    } else {
      error.classList.add("show");

      password.value = "";

      password.focus();
    }
  });

  /* SHOW PASSWORD */

  toggle.addEventListener("click", () => {
    if (password.type === "password") {
      password.type = "text";

      toggle.textContent = "Hide";
    } else {
      password.type = "password";

      toggle.textContent = "Show";
    }
  });
}

/* =====================================================
   NAVIGATION
===================================================== */

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      changePage(item.dataset.page);

      closeMobileNavigation();
    });
  });
}

function changePage(page) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  document.querySelectorAll(".page").forEach((section) => {
    section.classList.remove("active-page");
  });

  const target = $(`${page}Page`);

  if (target) {
    target.classList.add("active-page");
  }

  const title = $("pageTitle");

  const description = $("pageDescription");

  const breadcrumb = document.querySelector(".breadcrumb");

  if (page === "dashboard") {
    title.textContent = "Client & Project Management Dashboard";

    description.textContent =
      "Complete overview of clients, projects, industries and technologies.";

    breadcrumb.textContent = "W3Care / Dashboard";
  }

  if (page === "projects") {
    title.textContent = "Projects";

    description.textContent =
      "Browse and review projects from the master database.";

    breadcrumb.textContent = "W3Care / Projects";

    renderProjects();
  }

  if (page === "analytics") {
    title.textContent = "Project Analytics";

    description.textContent =
      "Detailed project distribution based on the master database.";

    breadcrumb.textContent = "W3Care / Analytics";

    updateAnalytics();
  }
}

/* =====================================================
   MOBILE NAVIGATION
===================================================== */

function setupMobileNavigation() {
  $("mobileMenuButton").addEventListener("click", () => {
    $("sidebar").classList.add("open");

    $("mobileOverlay").classList.add("show");
  });

  $("sidebarClose").addEventListener("click", closeMobileNavigation);

  $("mobileOverlay").addEventListener("click", closeMobileNavigation);
}

function closeMobileNavigation() {
  $("sidebar").classList.remove("open");

  $("mobileOverlay").classList.remove("show");
}

/* =====================================================
   LOAD EXCEL
===================================================== */

async function loadData() {
  try {
    const response = await fetch("/api/data");

    if (!response.ok) {
      throw new Error("Unable to load project data.");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Invalid data received.");
    }

    allProjects = Array.isArray(result.rows) ? result.rows : [];

    populateFilters();

    applyFilters();

    updateLastUpdated();

    setupAutoRefresh();
  } catch (error) {
    console.error(error);

    $("filterSummary").textContent =
      `Unable to load dashboard data: ${error.message}`;
  }
}

/* =====================================================
   DATA HELPERS
===================================================== */

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function getClient(row) {
  return clean(row["Client Name"]);
}

function getProject(row) {
  return clean(row["Project"]);
}

function getTechnology(row) {
  const value = clean(row["Tech Stack"]);

  if (!value) {
    return "Unknown";
  }

  const lower = value.toLowerCase();

  /* WORDPRESS NORMALIZATION */

  if (
    lower === "wp" ||
    lower === "wp cms" ||
    lower === "wordpress" ||
    lower === "wordpress cms" ||
    lower.includes("wordpress")
  ) {
    return "WordPress";
  }

  return value;
}

function getWebsite(row) {
  return clean(row["Website Domain"]);
}

function getIndustry(row) {
  return clean(row["Industry"]) || "Unknown";
}

function getCountry(row) {
  return clean(row["Country"]) || "Unknown";
}

function getContinent(row) {
  return clean(row["Continent"]) || "Unknown";
}

function getStatus(row) {
  return clean(row["Current Status"]) || "Unknown";
}

/* =====================================================
   FILTER OPTIONS
===================================================== */

function uniqueValues(values) {
  return [...new Set(values.map((value) => clean(value)).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function populateFilters() {
  populateSelect("countryFilter", uniqueValues(allProjects.map(getCountry)));

  populateSelect(
    "continentFilter",
    uniqueValues(allProjects.map(getContinent)),
  );

  populateSelect("industryFilter", uniqueValues(allProjects.map(getIndustry)));

  populateSelect("statusFilter", uniqueValues(allProjects.map(getStatus)));

  populateSelect(
    "technologyFilter",
    uniqueValues(allProjects.map(getTechnology)),
  );
}

function populateSelect(id, values) {
  const select = $(id);

  if (!select) {
    return;
  }

  const previous = select.value;

  select.innerHTML = `<option value="">All</option>`;

  values.forEach((value) => {
    const option = document.createElement("option");

    option.value = value;

    option.textContent = value;

    select.appendChild(option);
  });

  if (values.includes(previous)) {
    select.value = previous;
  }
}

/* =====================================================
   FILTER SETUP
===================================================== */

function setupFilters() {
  [
    "countryFilter",
    "continentFilter",
    "industryFilter",
    "statusFilter",
    "technologyFilter",
  ].forEach((id) => {
    $(id).addEventListener("change", applyFilters);
  });

  $("searchFilter").addEventListener("input", debounce(applyFilters, 200));

  $("resetFilters").addEventListener("click", resetFilters);

  $("projectsResetButton").addEventListener("click", resetFilters);

  $("sidebarClearFilters").addEventListener("click", resetFilters);
}

/* =====================================================
   APPLY FILTERS
===================================================== */

function applyFilters() {
  const country = clean($("countryFilter").value);

  const continent = clean($("continentFilter").value);

  const industry = clean($("industryFilter").value);

  const status = clean($("statusFilter").value);

  const technology = clean($("technologyFilter").value);

  const search = clean($("searchFilter").value).toLowerCase();

  filteredProjects = allProjects.filter((row) => {
    if (country && getCountry(row) !== country) {
      return false;
    }

    if (continent && getContinent(row) !== continent) {
      return false;
    }

    if (industry && getIndustry(row) !== industry) {
      return false;
    }

    if (status && getStatus(row) !== status) {
      return false;
    }

    if (technology && getTechnology(row) !== technology) {
      return false;
    }

    if (search) {
      const searchText = [
        getClient(row),
        getProject(row),
        getTechnology(row),
        getWebsite(row),
        getIndustry(row),
        getCountry(row),
        getContinent(row),
        getStatus(row),
      ]
        .join(" ")
        .toLowerCase();

      if (!searchText.includes(search)) {
        return false;
      }
    }

    return true;
  });

  updateDashboard();
}

/* =====================================================
   RESET
===================================================== */

function resetFilters() {
  $("countryFilter").value = "";

  $("continentFilter").value = "";

  $("industryFilter").value = "";

  $("statusFilter").value = "";

  $("technologyFilter").value = "";

  $("searchFilter").value = "";

  applyFilters();
}

/* =====================================================
   DASHBOARD UPDATE
===================================================== */

function updateDashboard() {
  updateKpis();

  updateFilterSummary();

  updateCharts();

  renderProjects();

  updateAnalytics();
}

/* =====================================================
   KPI
===================================================== */

function updateKpis() {
  const total = filteredProjects.length;

  const active = countActiveProjects();

  const inactive = countInactiveProjects();

  const countries = new Set(filteredProjects.map(getCountry)).size;

  const technologies = new Set(filteredProjects.map(getTechnology)).size;

  const industries = new Set(filteredProjects.map(getIndustry)).size;

  $("totalProjects").textContent = total.toLocaleString();

  $("activeProjects").textContent = active.toLocaleString();

  $("inactiveProjects").textContent = inactive.toLocaleString();

  $("countryCount").textContent = countries.toLocaleString();

  $("technologyCount").textContent = technologies.toLocaleString();

  $("industryCount").textContent = industries.toLocaleString();
}

/* =====================================================
   STATUS LOGIC
===================================================== */

function countActiveProjects() {
  return filteredProjects.filter((row) => {
    const status = getStatus(row).toLowerCase();

    return (
      status.includes("active") ||
      status.includes("in progress") ||
      status.includes("ongoing") ||
      status.includes("development") ||
      status.includes("live")
    );
  }).length;
}

function countInactiveProjects() {
  return filteredProjects.filter((row) => {
    const status = getStatus(row).toLowerCase();

    return (
      status.includes("inactive") ||
      status.includes("cancel") ||
      status.includes("archived") ||
      status.includes("closed")
    );
  }).length;
}

/* =====================================================
   FILTER SUMMARY
===================================================== */

function updateFilterSummary() {
  const active = [];

  const country = $("countryFilter").value;

  const continent = $("continentFilter").value;

  const industry = $("industryFilter").value;

  const status = $("statusFilter").value;

  const technology = $("technologyFilter").value;

  const search = clean($("searchFilter").value);

  if (country) {
    active.push(`Country: ${country}`);
  }

  if (continent) {
    active.push(`Continent: ${continent}`);
  }

  if (industry) {
    active.push(`Industry: ${industry}`);
  }

  if (status) {
    active.push(`Status: ${status}`);
  }

  if (technology) {
    active.push(`Technology: ${technology}`);
  }

  if (search) {
    active.push(`Search: ${search}`);
  }

  if (!active.length) {
    $("filterSummary").textContent =
      `Showing all ${allProjects.length.toLocaleString()} projects`;

    $("projectFilterStatus").textContent = "All projects";

    return;
  }

  $("filterSummary").textContent =
    `Showing ${filteredProjects.length.toLocaleString()} of ${allProjects.length.toLocaleString()} projects • ${active.join(" • ")}`;

  $("projectFilterStatus").textContent = active.join(" • ");
}

/* =====================================================
   COUNT BY
===================================================== */

function countBy(data, getter) {
  const counts = {};

  data.forEach((row) => {
    const value = getter(row) || "Unknown";

    counts[value] = (counts[value] || 0) + 1;
  });

  return counts;
}

function sortedEntries(counts, limit = 12) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/* =====================================================
   CHART COLORS
===================================================== */

const COLORS = [
  "#0757c8",
  "#20a464",
  "#7758d7",
  "#e89020",
  "#d94b5b",
  "#159a9c",
  "#3d7bd9",
  "#56b78a",
  "#967ee2",
  "#efa94b",
  "#e47482",
  "#4eb5b7",
];

/* =====================================================
   CREATE CHART
===================================================== */

function createChart(id, labels, values, type, onClick) {
  const canvas = $(id);

  if (!canvas) {
    return;
  }

  if (charts[id]) {
    charts[id].destroy();
  }

  const isDoughnut = type === "doughnut";

  charts[id] = new Chart(canvas.getContext("2d"), {
    type,

    data: {
      labels,

      datasets: [
        {
          data: values,

          backgroundColor: labels.map(
            (_, index) => COLORS[index % COLORS.length],
          ),

          borderColor: isDoughnut ? "#ffffff" : "transparent",

          borderWidth: isDoughnut ? 2 : 0,

          borderRadius: isDoughnut ? 0 : 5,

          maxBarThickness: 22,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      indexAxis: type === "bar" ? "y" : "x",

      plugins: {
        legend: {
          display: isDoughnut,

          position: "bottom",

          labels: {
            usePointStyle: true,

            pointStyle: "circle",

            padding: 12,

            font: {
              size: 9,
            },
          },
        },

        tooltip: {
          callbacks: {
            label: (context) => {
              const total = values.reduce((sum, value) => sum + value, 0);

              const value = context.raw;

              const percentage = total
                ? ((value / total) * 100).toFixed(1)
                : "0.0";

              return ` ${value} projects (${percentage}%)`;
            },
          },
        },
      },

      scales: isDoughnut
        ? {}
        : {
            x: {
              beginAtZero: true,

              grid: {
                color: "#edf1f5",
              },

              ticks: {
                font: {
                  size: 8,
                },
              },
            },

            y: {
              grid: {
                display: false,
              },

              ticks: {
                font: {
                  size: 8,
                },
              },
            },
          },

      onClick: (event, elements) => {
        if (!elements.length || !onClick) {
          return;
        }

        const index = elements[0].index;

        onClick(labels[index]);
      },
    },
  });
}

/* =====================================================
   DASHBOARD CHARTS
===================================================== */

function updateCharts() {
  /* COUNTRY */

  const countries = sortedEntries(countBy(filteredProjects, getCountry), 12);

  createChart(
    "countryChart",

    countries.map((item) => item[0]),

    countries.map((item) => item[1]),

    "bar",

    (value) => {
      $("countryFilter").value = value;

      applyFilters();
    },
  );

  /* STATUS */

  const statuses = sortedEntries(countBy(filteredProjects, getStatus), 10);

  createChart(
    "statusChart",

    statuses.map((item) => item[0]),

    statuses.map((item) => item[1]),

    "doughnut",

    (value) => {
      $("statusFilter").value = value;

      applyFilters();
    },
  );

  /* TECHNOLOGY */

  const technologies = sortedEntries(
    countBy(filteredProjects, getTechnology),
    12,
  );

  createChart(
    "technologyChart",

    technologies.map((item) => item[0]),

    technologies.map((item) => item[1]),

    "bar",

    (value) => {
      $("technologyFilter").value = value;

      applyFilters();
    },
  );

  /* INDUSTRY */

  const industries = sortedEntries(countBy(filteredProjects, getIndustry), 12);

  createChart(
    "industryChart",

    industries.map((item) => item[0]),

    industries.map((item) => item[1]),

    "bar",

    (value) => {
      $("industryFilter").value = value;

      applyFilters();
    },
  );
}

/* =====================================================
   PROJECT TABLE
===================================================== */

function renderProjects() {
  const tbody = $("projectTableBody");

  if (!tbody) {
    return;
  }

  const rows = filteredProjects.slice(0, 500);

  if (!rows.length) {
    tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#8993a4;
                    "
                >
                    No projects found
                    for the selected filters.
                </td>

            </tr>

        `;
  } else {
    tbody.innerHTML = rows
      .map(
        (row) => `

                    <tr>

                        <td>
                            ${escapeHtml(getClient(row))}
                        </td>

                        <td>
                            ${escapeHtml(getProject(row))}
                        </td>

                        <td>
                            ${escapeHtml(getTechnology(row))}
                        </td>

                        <td>
                            ${escapeHtml(getWebsite(row))}
                        </td>

                        <td>
                            ${escapeHtml(getIndustry(row))}
                        </td>

                        <td>
                            ${escapeHtml(getCountry(row))}
                        </td>

                        <td>
                            ${escapeHtml(getContinent(row))}
                        </td>

                        <td>

                            <span class="status-badge">

                                ${escapeHtml(getStatus(row))}

                            </span>

                        </td>

                    </tr>

                `,
      )
      .join("");
  }

  $("projectResultCount").textContent =
    filteredProjects.length.toLocaleString();
}

/* =====================================================
   ANALYTICS
===================================================== */

function updateAnalytics() {
  $("analyticsProjects").textContent = filteredProjects.length.toLocaleString();

  $("analyticsTechnologies").textContent = new Set(
    filteredProjects.map(getTechnology),
  ).size.toLocaleString();

  $("analyticsCountries").textContent = new Set(
    filteredProjects.map(getCountry),
  ).size.toLocaleString();

  $("analyticsIndustries").textContent = new Set(
    filteredProjects.map(getIndustry),
  ).size.toLocaleString();

  const technologies = sortedEntries(
    countBy(filteredProjects, getTechnology),
    20,
  );

  createChart(
    "analyticsTechnologyChart",

    technologies.map((item) => item[0]),

    technologies.map((item) => item[1]),

    "bar",

    (value) => {
      $("technologyFilter").value = value;

      applyFilters();
    },
  );

  const statuses = sortedEntries(countBy(filteredProjects, getStatus), 15);

  createChart(
    "analyticsStatusChart",

    statuses.map((item) => item[0]),

    statuses.map((item) => item[1]),

    "doughnut",

    (value) => {
      $("statusFilter").value = value;

      applyFilters();
    },
  );

  const industries = sortedEntries(countBy(filteredProjects, getIndustry), 20);

  createChart(
    "analyticsIndustryChart",

    industries.map((item) => item[0]),

    industries.map((item) => item[1]),

    "bar",

    (value) => {
      $("industryFilter").value = value;

      applyFilters();
    },
  );

  const countries = sortedEntries(countBy(filteredProjects, getCountry), 20);

  createChart(
    "analyticsCountryChart",

    countries.map((item) => item[0]),

    countries.map((item) => item[1]),

    "bar",

    (value) => {
      $("countryFilter").value = value;

      applyFilters();
    },
  );

  const continents = sortedEntries(countBy(filteredProjects, getContinent), 10);

  createChart(
    "analyticsContinentChart",

    continents.map((item) => item[0]),

    continents.map((item) => item[1]),

    "bar",

    (value) => {
      $("continentFilter").value = value;

      applyFilters();
    },
  );
}

/* =====================================================
   REFRESH
===================================================== */

function setupRefresh() {
  $("refreshButton").addEventListener("click", async () => {
    const icon = $("refreshIcon");

    icon.classList.add("spin");

    await loadData();

    setTimeout(() => {
      icon.classList.remove("spin");
    }, 400);
  });
}

function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(() => {
    loadData();
  }, REFRESH_INTERVAL);
}

/* =====================================================
   LAST UPDATED
===================================================== */

function updateLastUpdated() {
  const now = new Date();

  const formatted = now.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  $("headerLastUpdated").textContent = `Last Updated: ${formatted}`;

  $("sidebarLastUpdated").textContent = formatted;
}

/* =====================================================
   KEYBOARD
===================================================== */

function setupKeyboard() {
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === "k") {
      event.preventDefault();

      $("searchFilter").focus();
    }
  });
}

/* =====================================================
   DEBOUNCE
===================================================== */

function debounce(callback, delay) {
  let timeout;

  return function () {
    const args = arguments;

    clearTimeout(timeout);

    timeout = setTimeout(() => {
      callback.apply(null, args);
    }, delay);
  };
}

/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
