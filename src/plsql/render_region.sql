-- APEX QR Scanner Plugin - region render procedure
-- Copyright (c) 2026 Vihen - MIT License
-- Paste into: Shared Components > Plug-ins > (plug-in) > Source > PL/SQL Code
-- Render Procedure/Function Name: render_region
procedure render_region (
    p_plugin in            apex_plugin.t_plugin,
    p_region in            apex_plugin.t_region,
    p_param  in            apex_plugin.t_region_render_param,
    p_result in out nocopy apex_plugin.t_region_render_result )
is
    l_target_item  varchar2(255) := p_region.attributes.get_varchar2('target-item');
    l_facing       varchar2(20)  := nvl(p_region.attributes.get_varchar2('camera-facing'), 'environment');
    l_stop         varchar2(5)   := case when upper(nvl(p_region.attributes.get_varchar2('stop-after-scan'), 'Y')) in ('Y','TRUE')
                                         then 'Y' else 'N' end;
    l_region_id    varchar2(255) := p_region.static_id;
    l_root_id      varchar2(300) := p_region.static_id || '_aqr';
    l_options      varchar2(4000);
begin
    if p_param.is_printer_friendly then
        return;
    end if;

    if l_target_item is null then
        raise_application_error(-20001, 'APEX QR Scanner: Target page item is required.');
    end if;

    if l_facing not in ('environment', 'user') then
        l_facing := 'environment';
    end if;

    apex_javascript.add_library(
        p_name           => 'js/jsQR',
        p_directory      => p_plugin.file_prefix,
        p_version        => null,
        p_skip_extension => false );

    apex_javascript.add_library(
        p_name           => 'js/qr-scanner',
        p_directory      => p_plugin.file_prefix,
        p_version        => null,
        p_skip_extension => false );

    apex_css.add_file(
        p_name      => 'css/qr-scanner',
        p_directory => p_plugin.file_prefix,
        p_version   => null );

    sys.htp.p('<div id="' || apex_escape.html_attribute(l_root_id) || '" class="aqr">');
    sys.htp.p('<div class="aqr-camera">'
        || '<video class="aqr-video" autoplay muted playsinline></video>'
        || '<div class="aqr-overlay"><div class="aqr-frame"></div></div>'
        || '</div>');
    sys.htp.p('<div class="aqr-status" role="status" aria-live="polite">Ready to scan</div>');
    sys.htp.p('<div class="aqr-error" role="alert" hidden></div>');
    sys.htp.p('<div class="aqr-controls">'
        || '<button type="button" class="aqr-start">Start Camera</button>'
        || '<button type="button" class="aqr-stop" hidden>Stop Camera</button>'
        || '<button type="button" class="aqr-switch">Switch Camera</button>'
        || '</div>');
    sys.htp.p('</div>');

    l_options :=
        '{"targetItem":'    || apex_escape.js_literal(l_target_item) ||
        ',"facingMode":'    || apex_escape.js_literal(l_facing) ||
        ',"stopAfterScan":' || case when l_stop = 'Y' then 'true' else 'false' end ||
        ',"regionId":'      || apex_escape.js_literal(l_region_id) || '}';

    apex_javascript.add_onload_code(
        p_code => 'APEXQRScanner.init(' || apex_escape.js_literal(l_root_id) || ',' || l_options || ');' );
end render_region;
